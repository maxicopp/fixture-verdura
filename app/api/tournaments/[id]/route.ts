import { NextRequest } from 'next/server'
import { dbGet, dbAll, dbRun, initSchema } from '../../../lib/db'
import { requireAuth, isValidGoals } from '../../../lib/auth'
import { calcStandings } from '../../../lib/fixture'
import type { Round } from '../../../types'

// GET /api/tournaments/:id (público)
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await initSchema()
  const { id } = await params

  const [tournament, players, matchRows] = await Promise.all([
    dbGet('SELECT * FROM tournaments WHERE id = ?', [id]),
    dbAll('SELECT name, disabled FROM tournament_players WHERE tournament_id = ? ORDER BY id', [id]),
    dbAll('SELECT match_key, round, stage, home, away, home_goals, away_goals, played, penalty_winner, home_penalties, away_penalties FROM matches WHERE tournament_id = ? ORDER BY round, id', [id]),
  ])

  if (!tournament) {
    return Response.json({ error: 'Torneo no encontrado' }, { status: 404 })
  }

  const roundsMap: Record<number, Round> = {}
  for (const m of matchRows) {
    const round = m.round as number
    if (!roundsMap[round]) roundsMap[round] = { round, matches: [] }
    roundsMap[round].matches.push({
      id: m.match_key as string,
      home: m.home as string,
      away: m.away as string,
      homeGoals: m.home_goals as number | null,
      awayGoals: m.away_goals as number | null,
      played: !!m.played,
      stage: (m.stage as string) ?? null,
      penaltyWinner: (m.penalty_winner as string) ?? null,
      homePenalties: (m.home_penalties as number) ?? null,
      awayPenalties: (m.away_penalties as number) ?? null,
    })
  }
  const fixture = Object.values(roundsMap).sort((a, b) => a.round - b.round)
  const playerNames = players.map(p => p.name as string)
  const standings = calcStandings(playerNames, fixture)
  const disabledPlayers = players.filter(p => p.disabled).map(p => p.name as string)

  const cacheTime = tournament.status === 'finished' ? 60 : 10
  return new Response(JSON.stringify({ tournament, players: playerNames, disabledPlayers, fixture, standings }), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': `public, s-maxage=${cacheTime}, stale-while-revalidate=${cacheTime * 2}`,
    },
  })
}

// PATCH /api/tournaments/:id (requiere auth)
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireAuth()
  if (authError) return authError

  await initSchema()
  const { id } = await params
  const body = await request.json()

  if (body.action === 'finish') {
    const { champion, top_scorer, top_scorer_goals } = body
    if (!champion || typeof champion !== 'string') {
      return Response.json({ error: 'Se requiere un campeón válido' }, { status: 400 })
    }
    await dbRun(
      "UPDATE tournaments SET status = 'finished', champion = ?, top_scorer = ?, top_scorer_goals = ?, finished_at = datetime('now') WHERE id = ?",
      [champion.trim(), top_scorer || null, top_scorer_goals || 0, id]
    )
    return Response.json({ message: 'Torneo finalizado' })
  }

  if (body.action === 'result') {
    const { match_key, home_goals, away_goals } = body
    if (!match_key || !isValidGoals(home_goals) || !isValidGoals(away_goals)) {
      return Response.json({ error: 'Campos inválidos (goles deben ser enteros entre 0 y 99)' }, { status: 400 })
    }
    await dbRun(
      'UPDATE matches SET home_goals = ?, away_goals = ?, played = 1 WHERE tournament_id = ? AND match_key = ?',
      [Number(home_goals), Number(away_goals), id, match_key]
    )
    return Response.json({ message: 'Resultado guardado' })
  }

  if (body.action === 'reset') {
    const { match_key } = body
    if (!match_key) {
      return Response.json({ error: 'Falta match_key' }, { status: 400 })
    }
    await dbRun(
      'UPDATE matches SET home_goals = NULL, away_goals = NULL, played = 0 WHERE tournament_id = ? AND match_key = ?',
      [id, match_key]
    )
    return Response.json({ message: 'Partido reseteado' })
  }

  return Response.json({ error: 'Acción no reconocida' }, { status: 400 })
}
