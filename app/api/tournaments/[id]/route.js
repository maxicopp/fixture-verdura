import { dbGet, dbAll, dbRun, initSchema } from '../../../lib/db'
import { calcStandings } from '../../../lib/fixture'

// GET /api/tournaments/:id
export async function GET(request, { params }) {
  await initSchema()
  const { id } = await params

  // Ejecutar queries en paralelo para reducir latencia
  const [tournament, players, matchRows] = await Promise.all([
    dbGet('SELECT * FROM tournaments WHERE id = ?', [id]),
    dbAll('SELECT name, disabled FROM tournament_players WHERE tournament_id = ? ORDER BY id', [id]),
    dbAll('SELECT match_key, round, stage, home, away, home_goals, away_goals, played, penalty_winner, home_penalties, away_penalties FROM matches WHERE tournament_id = ? ORDER BY round, id', [id]),
  ])

  if (!tournament) {
    return Response.json({ error: 'Torneo no encontrado' }, { status: 404 })
  }

  const roundsMap = {}
  for (const m of matchRows) {
    if (!roundsMap[m.round]) roundsMap[m.round] = { round: m.round, matches: [] }
    roundsMap[m.round].matches.push({
      id: m.match_key, home: m.home, away: m.away,
      homeGoals: m.home_goals, awayGoals: m.away_goals, played: !!m.played,
      stage: m.stage ?? null,
      penaltyWinner: m.penalty_winner ?? null,
      homePenalties: m.home_penalties ?? null,
      awayPenalties: m.away_penalties ?? null,
    })
  }
  const fixture = Object.values(roundsMap).sort((a, b) => a.round - b.round)
  const playerNames = players.map(p => p.name)
  const standings = calcStandings(playerNames, fixture)
  const disabledPlayers = players.filter(p => p.disabled).map(p => p.name)

  // Cache por 60s para torneos finalizados, 10s para activos
  const cacheTime = tournament.status === 'finished' ? 60 : 10
  return new Response(JSON.stringify({ tournament, players: playerNames, disabledPlayers, fixture, standings }), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': `public, s-maxage=${cacheTime}, stale-while-revalidate=${cacheTime * 2}`,
    },
  })
}

// PATCH /api/tournaments/:id
export async function PATCH(request, { params }) {
  await initSchema()
  const { id } = await params
  const body = await request.json()

  if (body.action === 'finish') {
    const { champion, top_scorer, top_scorer_goals } = body
    await dbRun(
      "UPDATE tournaments SET status = 'finished', champion = ?, top_scorer = ?, top_scorer_goals = ?, finished_at = datetime('now') WHERE id = ?",
      [champion, top_scorer || null, top_scorer_goals || 0, id]
    )
    return Response.json({ message: 'Torneo finalizado' })
  }

  if (body.action === 'result') {
    const { match_key, home_goals, away_goals } = body
    await dbRun(
      'UPDATE matches SET home_goals = ?, away_goals = ?, played = 1 WHERE tournament_id = ? AND match_key = ?',
      [home_goals, away_goals, id, match_key]
    )
    return Response.json({ message: 'Resultado guardado' })
  }

  if (body.action === 'reset') {
    const { match_key } = body
    await dbRun(
      'UPDATE matches SET home_goals = NULL, away_goals = NULL, played = 0 WHERE tournament_id = ? AND match_key = ?',
      [id, match_key]
    )
    return Response.json({ message: 'Partido reseteado' })
  }

  return Response.json({ error: 'Acción no reconocida' }, { status: 400 })
}
