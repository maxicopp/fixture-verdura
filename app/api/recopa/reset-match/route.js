import { cookies } from 'next/headers'
import { dbGet, dbRun, initSchema } from '../../../lib/db'

const SESSION_TOKEN = 'verdura-admin-session'

async function isAuthed() {
  const cookieStore = await cookies()
  return !!cookieStore.get(SESSION_TOKEN)?.value
}

// POST /api/recopa/reset-match
export async function POST(request) {
  if (!(await isAuthed())) {
    return Response.json({ error: 'No autorizado' }, { status: 401 })
  }

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
