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
    [tournament.id as number]
  )

  const matchRows = await dbAll(
    'SELECT match_key, round, home, away, home_goals, away_goals, played FROM matches WHERE tournament_id = ? ORDER BY round, id',
    [tournament.id as number]
  )

  const roundsMap: Record<number, { round: number; matches: unknown[] }> = {}
  for (const m of matchRows) {
    const round = m.round as number
    if (!roundsMap[round]) roundsMap[round] = { round, matches: [] }
    roundsMap[round].matches.push({
      id: m.match_key,
      home: m.home,
      away: m.away,
      homeGoals: m.home_goals,
      awayGoals: m.away_goals,
      played: !!m.played,
    })
  }
  const fixture = Object.values(roundsMap).sort((a, b) => a.round - b.round)
  const playerNames = players.map(p => p.name as string)
  const disabledPlayers = players.filter(p => p.disabled).map(p => p.name as string)

  // ── Historical stats for odds calculation ──────────────────────────────────
  const allHistoricalMatches = await dbAll(`
    SELECT home, away, home_goals, away_goals
    FROM matches
    WHERE played = 1 AND tournament_id != ?
    ORDER BY id ASC
  `, [tournament.id as number])

  const histStats: Record<string, { pj: number; pg: number; pe: number; pp: number; gf: number; gc: number }> = {}
  for (const m of allHistoricalMatches) {
    const home = m.home as string
    const away = m.away as string
    const hg = m.home_goals as number
    const ag = m.away_goals as number
    if (!histStats[home]) histStats[home] = { pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0 }
    if (!histStats[away]) histStats[away] = { pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0 }
    const h = histStats[home]
    const a = histStats[away]
    h.pj++; h.gf += hg; h.gc += ag
    a.pj++; a.gf += ag; a.gc += hg
    if (hg > ag) { h.pg++; a.pp++ }
    else if (ag > hg) { a.pg++; h.pp++ }
    else { h.pe++; a.pe++ }
  }

  return Response.json({ tournament, players: playerNames, disabledPlayers, fixture, histStats })
}
