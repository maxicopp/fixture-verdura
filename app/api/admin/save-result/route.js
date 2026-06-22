import { cookies } from 'next/headers'
import { dbGet, dbRun, initSchema } from '../../../lib/db'

const SESSION_TOKEN = 'verdura-admin-session'

async function isAuthed() {
  const cookieStore = await cookies()
  return !!cookieStore.get(SESSION_TOKEN)?.value
}

// POST /api/admin/save-result
export async function POST(request) {
  if (!(await isAuthed())) {
    return Response.json({ error: 'No autorizado' }, { status: 401 })
  }

  await initSchema()
  const body = await request.json()
  const { match_key, home_goals, away_goals, tournament_id } = body

  if (match_key == null || home_goals == null || away_goals == null) {
    return Response.json({ error: 'Faltan campos' }, { status: 400 })
  }

  let tid = tournament_id
  if (!tid) {
    const active = await dbGet("SELECT id FROM tournaments WHERE status = 'active' ORDER BY id DESC LIMIT 1")
    if (!active) return Response.json({ error: 'No hay torneo activo' }, { status: 404 })
    tid = active.id
  }

  await dbRun(
    'UPDATE matches SET home_goals = ?, away_goals = ?, played = 1 WHERE tournament_id = ? AND match_key = ?',
    [home_goals, away_goals, tid, match_key]
  )

  return Response.json({ ok: true, message: 'Resultado guardado' })
}
