import { dbGet, dbAll, initSchema } from '../../../lib/db'

// GET /api/tournaments/active
export async function GET() {
  await initSchema()

  let tournament = await dbGet(
    "SELECT * FROM tournaments WHERE status = 'active' ORDER BY id DESC LIMIT 1"
  )

  if (!tournament) {
    tournament = await dbGet('SELECT * FROM tournaments ORDER BY id DESC LIMIT 1')
  }

  if (!tournament) {
    return Response.json({ error: 'No hay torneos' }, { status: 404 })
  }

  const players = await dbAll(
    'SELECT name, disabled FROM tournament_players WHERE tournament_id = ? ORDER BY id',
    [tournament.id]
  )

  const matchRows = await dbAll(
    'SELECT match_key, round, home, away, home_goals, away_goals, played FROM matches WHERE tournament_id = ? ORDER BY round, id',
    [tournament.id]
  )

  const roundsMap = {}
  for (const m of matchRows) {
    if (!roundsMap[m.round]) roundsMap[m.round] = { round: m.round, matches: [] }
    roundsMap[m.round].matches.push({
      id: m.match_key,
      home: m.home,
      away: m.away,
      homeGoals: m.home_goals,
      awayGoals: m.away_goals,
      played: !!m.played,
    })
  }
  const fixture = Object.values(roundsMap).sort((a, b) => a.round - b.round)
  const playerNames = players.map(p => p.name)
  const disabledPlayers = players.filter(p => p.disabled).map(p => p.name)

  // ── Historical stats for odds calculation ──────────────────────────────────
  // All played matches across ALL past tournaments (excluding current)
  const allHistoricalMatches = await dbAll(`
    SELECT home, away, home_goals, away_goals
    FROM matches
    WHERE played = 1 AND tournament_id != ?
    ORDER BY id ASC
  `, [tournament.id])

  // Build per-player historical stats: { name: { pj, pg, pe, pp, gf, gc } }
  const histStats = {}
  for (const m of allHistoricalMatches) {
    if (!histStats[m.home]) histStats[m.home] = { pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0 }
    if (!histStats[m.away]) histStats[m.away] = { pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0 }
    const h = histStats[m.home]
    const a = histStats[m.away]
    h.pj++; h.gf += m.home_goals; h.gc += m.away_goals
    a.pj++; a.gf += m.away_goals; a.gc += m.home_goals
    if (m.home_goals > m.away_goals)      { h.pg++; a.pp++ }
    else if (m.away_goals > m.home_goals) { a.pg++; h.pp++ }
    else                                  { h.pe++; a.pe++ }
  }

  return Response.json({ tournament, players: playerNames, disabledPlayers, fixture, histStats })
}
