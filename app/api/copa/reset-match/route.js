import { cookies } from 'next/headers'
import { dbGet, dbRun, initSchema } from '../../../lib/db'

const SESSION_TOKEN = 'verdura-admin-session'

async function isAuthed() {
  const cookieStore = await cookies()
  return !!cookieStore.get(SESSION_TOKEN)?.value
}

// POST /api/copa/reset-match
export async function POST(request) {
  if (!(await isAuthed())) {
    return Response.json({ error: 'No autorizado' }, { status: 401 })
  }

  await initSchema()
  const body = await request.json()
  const { match_key, tournament_id } = body

  let tid = tournament_id
  if (!tid) {
    const active = await dbGet("SELECT id FROM tournaments WHERE type = 'copa' AND status = 'active' ORDER BY id DESC LIMIT 1")
    if (!active) return Response.json({ error: 'No hay copa activa' }, { status: 404 })
    tid = active.id
  }

  // Resetear el partido
  await dbRun(
    'UPDATE matches SET home_goals = NULL, away_goals = NULL, played = 0 WHERE tournament_id = ? AND match_key = ?',
    [tid, match_key]
  )

  // Resetear partidos dependientes y propagaciones
  if (match_key === 'qf1') {
    // Resetear SF1 away a TBD, y resetear SF1 si ya se jugó
    await dbRun("UPDATE matches SET away = 'TBD', home_goals = NULL, away_goals = NULL, played = 0 WHERE tournament_id = ? AND match_key = 'sf1'", [tid])
    // Resetear final home a TBD
    await dbRun("UPDATE matches SET home = 'TBD', home_goals = NULL, away_goals = NULL, played = 0 WHERE tournament_id = ? AND match_key = 'final'", [tid])
  } else if (match_key === 'qf2') {
    await dbRun("UPDATE matches SET away = 'TBD', home_goals = NULL, away_goals = NULL, played = 0 WHERE tournament_id = ? AND match_key = 'sf2'", [tid])
    await dbRun("UPDATE matches SET away = 'TBD', home_goals = NULL, away_goals = NULL, played = 0 WHERE tournament_id = ? AND match_key = 'final'", [tid])
  } else if (match_key === 'sf1') {
    await dbRun("UPDATE matches SET home = 'TBD', home_goals = NULL, away_goals = NULL, played = 0 WHERE tournament_id = ? AND match_key = 'final'", [tid])
  } else if (match_key === 'sf2') {
    await dbRun("UPDATE matches SET away = 'TBD', home_goals = NULL, away_goals = NULL, played = 0 WHERE tournament_id = ? AND match_key = 'final'", [tid])
  }

  // Si el torneo estaba finalizado, reactivarlo
  await dbRun(
    "UPDATE tournaments SET status = 'active', champion = NULL, top_scorer = NULL, top_scorer_goals = 0, finished_at = NULL WHERE id = ? AND status = 'finished'",
    [tid]
  )

  return Response.json({ ok: true, message: 'Partido reseteado' })
}
