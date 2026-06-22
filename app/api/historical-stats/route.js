import { dbAll, initSchema } from '../../lib/db'

// GET /api/historical-stats
export async function GET() {
  await initSchema()

  const allMatches = await dbAll(`
    SELECT m.tournament_id, m.home, m.away, m.home_goals, m.away_goals, t.season, t.year
    FROM matches m JOIN tournaments t ON t.id = m.tournament_id
    WHERE m.played = 1
  `)

  const statsMap = {}
  for (const m of allMatches) {
    if (!statsMap[m.home]) statsMap[m.home] = { name: m.home, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, pts: 0, tournaments: 0 }
    const h = statsMap[m.home]
    h.pj++; h.gf += m.home_goals; h.gc += m.away_goals
    if (m.home_goals > m.away_goals) { h.pg++; h.pts += 3 }
    else if (m.home_goals === m.away_goals) { h.pe++; h.pts += 1 }
    else { h.pp++ }

    if (!statsMap[m.away]) statsMap[m.away] = { name: m.away, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, pts: 0, tournaments: 0 }
    const a = statsMap[m.away]
    a.pj++; a.gf += m.away_goals; a.gc += m.home_goals
    if (m.away_goals > m.home_goals) { a.pg++; a.pts += 3 }
    else if (m.away_goals === m.home_goals) { a.pe++; a.pts += 1 }
    else { a.pp++ }
  }

  const tournamentParticipation = await dbAll('SELECT name, COUNT(*) as count FROM tournament_players GROUP BY name')
  for (const tp of tournamentParticipation) {
    if (statsMap[tp.name]) statsMap[tp.name].tournaments = tp.count
  }

  const historicalTable = Object.values(statsMap).sort((a, b) =>
    b.pts - a.pts || (b.gf - b.gc) - (a.gf - a.gc) || b.gf - a.gf
  )

  const tournaments = await dbAll('SELECT id, season, year FROM tournaments ORDER BY year ASC, id ASC')

  const pointsByTournament = tournaments.map(t => {
    const matches = allMatches.filter(m => m.tournament_id === t.id)
    const entry = { tournament: t.season, id: t.id }
    for (const name of Object.keys(statsMap)) {
      let pts = 0
      for (const m of matches) {
        if (m.home === name) pts += m.home_goals > m.away_goals ? 3 : m.home_goals === m.away_goals ? 1 : 0
        if (m.away === name) pts += m.away_goals > m.home_goals ? 3 : m.away_goals === m.home_goals ? 1 : 0
      }
      entry[name] = pts
    }
    return entry
  })

  const titles = await dbAll("SELECT champion as name, COUNT(*) as count FROM tournaments WHERE status = 'finished' AND champion IS NOT NULL GROUP BY champion")
  const titlesMap = Object.fromEntries(titles.map(t => [t.name, t.count]))

  return Response.json({ historicalTable, pointsByTournament, titlesMap, totalTournaments: tournaments.length })
}
