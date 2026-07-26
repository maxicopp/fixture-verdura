import { dbGet, dbAll, initSchema } from '../../../lib/db'

// GET /api/tournaments/latest
export async function GET() {
  await initSchema()

  const tournament = await dbGet(
    "SELECT * FROM tournaments WHERE type = 'league' ORDER BY id DESC LIMIT 1"
  )

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

  return Response.json({ tournament, players: playerNames, disabledPlayers, fixture })
}
