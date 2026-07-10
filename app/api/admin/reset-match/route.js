import { dbGet, dbRun, initSchema } from '../../../lib/db'
import { requireAuth } from '../../../lib/auth'

// POST /api/admin/reset-match
export async function POST(request) {
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
    const active = await dbGet("SELECT id FROM tournaments WHERE status = 'active' ORDER BY id DESC LIMIT 1")
    if (!active) return Response.json({ error: 'No hay torneo activo' }, { status: 404 })
    tid = active.id
  }

  await dbRun(
    'UPDATE matches SET home_goals = NULL, away_goals = NULL, played = 0 WHERE tournament_id = ? AND match_key = ?',
    [tid, match_key]
  )

  return Response.json({ ok: true, message: 'Partido reseteado' })
}
