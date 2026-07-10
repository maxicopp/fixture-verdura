import { dbAll, initSchema } from '../../lib/db'

// GET /api/hall-of-fame
export async function GET() {
  await initSchema()

  const champions = await dbAll(`
    SELECT id, name, season, year, type, champion, top_scorer, top_scorer_goals, finished_at
    FROM tournaments WHERE status = 'finished' AND champion IS NOT NULL
    ORDER BY year DESC, id DESC
  `)

  const titleCounts = await dbAll(`
    SELECT champion as name, COUNT(*) as titles
    FROM tournaments WHERE status = 'finished' AND champion IS NOT NULL
    GROUP BY champion ORDER BY titles DESC, name ASC
  `)

  const allMatches = await dbAll('SELECT home, away, home_goals, away_goals FROM matches WHERE played = 1')

  const goalMap: Record<string, number> = {}
  for (const m of allMatches) {
    goalMap[m.home as string] = (goalMap[m.home as string] || 0) + ((m.home_goals as number) || 0)
    goalMap[m.away as string] = (goalMap[m.away as string] || 0) + ((m.away_goals as number) || 0)
  }
  const allTimeScorers = Object.entries(goalMap)
    .map(([name, goals]) => ({ name, goals }))
    .sort((a, b) => b.goals - a.goals)

  return Response.json({ champions, titleCounts, allTimeScorers })
}
