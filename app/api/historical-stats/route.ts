import { dbAll, initSchema } from '../../lib/db'

// GET /api/historical-stats
export async function GET() {
  await initSchema()

  const allMatches = await dbAll(`
    SELECT m.tournament_id, m.home, m.away, m.home_goals, m.away_goals, t.season, t.year, t.type
    FROM matches m JOIN tournaments t ON t.id = m.tournament_id
    WHERE m.played = 1 AND t.type = 'league'
  `)

  const statsMap: Record<string, { name: string; pj: number; pg: number; pe: number; pp: number; gf: number; gc: number; pts: number; tournaments: number }> = {}
  for (const m of allMatches) {
    const home = m.home as string
    const away = m.away as string
    const hg = m.home_goals as number
    const ag = m.away_goals as number

    if (!statsMap[home]) statsMap[home] = { name: home, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, pts: 0, tournaments: 0 }
    const h = statsMap[home]
    h.pj++; h.gf += hg; h.gc += ag
    if (hg > ag) { h.pg++; h.pts += 3 }
    else if (hg === ag) { h.pe++; h.pts += 1 }
    else { h.pp++ }

    if (!statsMap[away]) statsMap[away] = { name: away, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, pts: 0, tournaments: 0 }
    const a = statsMap[away]
    a.pj++; a.gf += ag; a.gc += hg
    if (ag > hg) { a.pg++; a.pts += 3 }
    else if (ag === hg) { a.pe++; a.pts += 1 }
    else { a.pp++ }
  }

  const tournamentParticipation = await dbAll(
    "SELECT tp.name, COUNT(*) as count FROM tournament_players tp JOIN tournaments t ON t.id = tp.tournament_id WHERE t.type = 'league' GROUP BY tp.name"
  )
  for (const tp of tournamentParticipation) {
    if (statsMap[tp.name as string]) statsMap[tp.name as string].tournaments = tp.count as number
  }

  const historicalTable = Object.values(statsMap).sort((a, b) =>
    b.pts - a.pts || (b.gf - b.gc) - (a.gf - a.gc) || b.gf - a.gf
  )

  const tournaments = await dbAll("SELECT id, season, year FROM tournaments WHERE type = 'league' ORDER BY year ASC, id ASC")

  const pointsByTournament = tournaments.map(t => {
    const tMatches = allMatches.filter(m => m.tournament_id === t.id)
    const entry: Record<string, number | string> = { tournament: t.season as string, id: t.id as number }
    for (const name of Object.keys(statsMap)) {
      let pts = 0
      for (const m of tMatches) {
        if (m.home === name) pts += (m.home_goals as number) > (m.away_goals as number) ? 3 : (m.home_goals as number) === (m.away_goals as number) ? 1 : 0
        if (m.away === name) pts += (m.away_goals as number) > (m.home_goals as number) ? 3 : (m.away_goals as number) === (m.home_goals as number) ? 1 : 0
      }
      entry[name] = pts
    }
    return entry
  })

  const titles = await dbAll("SELECT champion as name, COUNT(*) as count FROM tournaments WHERE status = 'finished' AND champion IS NOT NULL GROUP BY champion")
  const titlesMap: Record<string, number> = Object.fromEntries(titles.map(t => [t.name as string, t.count as number]))

  return Response.json({ historicalTable, pointsByTournament, titlesMap, totalTournaments: tournaments.length })
}
