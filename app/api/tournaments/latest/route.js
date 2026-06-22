import { dbGet, dbAll, initSchema } from '../../../lib/db'

// GET /api/tournaments/latest — el torneo más reciente sin importar status
// Usado por el admin para poder editar aunque el torneo esté finalizado
export async function GET() {
  await initSchema()

  const tournament = await dbGet(
    'SELECT * FROM tournaments ORDER BY id DESC LIMIT 1'
  )

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

  return Response.json({ tournament, players: playerNames, disabledPlayers, fixture })
}
