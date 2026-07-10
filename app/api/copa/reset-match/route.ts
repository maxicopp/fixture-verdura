import { NextRequest } from 'next/server'
import { dbGet, dbRun, initSchema } from '../../../lib/db'
import { requireAuth } from '../../../lib/auth'

// POST /api/copa/reset-match
export async function POST(request: NextRequest) {
  const authError = await requireAuth()
  if (authError) return authError

  await initSchema()
  const body = await request.json()
  const { match_key, tournament_id } = body

  if (!match_key) {
    return Response.json({ error: 'Falta match_key' }, { status: 400 })
  }

  let tid = tournament_id
  if (!tid) {
    const active = await dbGet("SELECT id FROM tournaments WHERE type = 'copa' AND status = 'active' ORDER BY id DESC LIMIT 1")
    if (!active) return Response.json({ error: 'No hay copa activa' }, { status: 404 })
    tid = active.id
  }

  await dbRun(
    'UPDATE matches SET home_goals = NULL, away_goals = NULL, played = 0, penalty_winner = NULL WHERE tournament_id = ? AND match_key = ?',
    [tid, match_key]
  )

  if (match_key === 'qf1') {
    await dbRun("UPDATE matches SET away = 'TBD', home_goals = NULL, away_goals = NULL, played = 0, penalty_winner = NULL WHERE tournament_id = ? AND match_key = 'sf1'", [tid])
    await dbRun("UPDATE matches SET home = 'TBD', home_goals = NULL, away_goals = NULL, played = 0, penalty_winner = NULL WHERE tournament_id = ? AND match_key = 'final'", [tid])
  } else if (match_key === 'qf2') {
    await dbRun("UPDATE matches SET away = 'TBD', home_goals = NULL, away_goals = NULL, played = 0, penalty_winner = NULL WHERE tournament_id = ? AND match_key = 'sf2'", [tid])
    await dbRun("UPDATE matches SET away = 'TBD', home_goals = NULL, away_goals = NULL, played = 0, penalty_winner = NULL WHERE tournament_id = ? AND match_key = 'final'", [tid])
  } else if (match_key === 'sf1') {
    await dbRun("UPDATE matches SET home = 'TBD', home_goals = NULL, away_goals = NULL, played = 0, penalty_winner = NULL WHERE tournament_id = ? AND match_key = 'final'", [tid])
  } else if (match_key === 'sf2') {
    await dbRun("UPDATE matches SET away = 'TBD', home_goals = NULL, away_goals = NULL, played = 0, penalty_winner = NULL WHERE tournament_id = ? AND match_key = 'final'", [tid])
  }

  await dbRun(
    "UPDATE tournaments SET status = 'active', champion = NULL, top_scorer = NULL, top_scorer_goals = 0, finished_at = NULL WHERE id = ? AND status = 'finished'",
    [tid]
  )

  return Response.json({ ok: true, message: 'Partido reseteado' })
}
