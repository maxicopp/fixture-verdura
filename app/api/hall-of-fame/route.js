import { dbAll, initSchema } from '../../lib/db'

// GET /api/hall-of-fame
export async function GET() {
  await initSchema()

  const champions = await dbAll(`
    SELECT id, name, season, year, champion, top_scorer, top_scorer_goals, finished_at
    FROM tournaments WHERE status = 'finished' AND champion IS NOT NULL
    ORDER BY year DESC, id DESC
  `)

  const titleCounts = await dbAll(`
    SELECT champion as name, COUNT(*) as titles
    FROM tournaments WHERE status = 'finished' AND champion IS NOT NULL
    GROUP BY champion ORDER BY titles DESC, name ASC
  `)

  const allMatches = await dbAll('SELECT home, away, home_goals, away_goals FROM matches WHERE played = 1')

  const goalMap = {}
  for (const m of allMatches) {
    goalMap[m.home] = (goalMap[m.home] || 0) + (m.home_goals || 0)
    goalMap[m.away] = (goalMap[m.away] || 0) + (m.away_goals || 0)
  }
  const allTimeScorers = Object.entries(goalMap)
    .map(([name, goals]) => ({ name, goals }))
    .sort((a, b) => b.goals - a.goals)

  return Response.json({ champions, titleCounts, allTimeScorers })
}
