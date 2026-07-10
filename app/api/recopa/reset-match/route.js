import { dbGet, dbRun, initSchema } from '../../../lib/db'
import { requireAuth } from '../../../lib/auth'

// POST /api/recopa/reset-match
export async function POST(request) {
  const authError = await requireAuth()
  if (authError) return authError

  await initSchema()
  const body = await request.json()
  const { tournament_id } = body

  let tid = tournament_id
  if (!tid) {
    const active = await dbGet("SELECT id FROM tournaments WHERE type = 'recopa' AND status = 'active' ORDER BY id DESC LIMIT 1")
    if (!active) {
      // Si está finalizada, buscar la última recopa
      const finished = await dbGet("SELECT id FROM tournaments WHERE type = 'recopa' ORDER BY id DESC LIMIT 1")
      if (!finished) return Response.json({ error: 'No hay recopa' }, { status: 404 })
      tid = finished.id
    } else {
      tid = active.id
    }
  }

  // Resetear el partido
  await dbRun(
    "UPDATE matches SET home_goals = NULL, away_goals = NULL, played = 0, penalty_winner = NULL, home_penalties = NULL, away_penalties = NULL WHERE tournament_id = ? AND match_key = 'recopa-final'",
    [tid]
  )

  // Reactivar el torneo
  await dbRun(
    "UPDATE tournaments SET status = 'active', champion = NULL, finished_at = NULL WHERE id = ?",
    [tid]
  )

  return Response.json({ ok: true, message: 'Recopa reseteada' })
}
