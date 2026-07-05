import { cookies } from 'next/headers'
import { dbGet, dbRun, initSchema } from '../../../lib/db'

const SESSION_TOKEN = 'verdura-admin-session'

async function isAuthed() {
  const cookieStore = await cookies()
  return !!cookieStore.get(SESSION_TOKEN)?.value
}

// POST /api/recopa/save-result
// Es un solo partido con alargue y penales
export async function POST(request) {
  if (!(await isAuthed())) {
    return Response.json({ error: 'No autorizado' }, { status: 401 })
  }

  await initSchema()
  const body = await request.json()
  const { home_goals, away_goals, penalty_winner, home_penalties, away_penalties, tournament_id } = body

  if (home_goals == null || away_goals == null) {
    return Response.json({ error: 'Faltan campos (home_goals, away_goals)' }, { status: 400 })
  }

  // Obtener recopa activa
  let tid = tournament_id
  if (!tid) {
    const active = await dbGet("SELECT id FROM tournaments WHERE type = 'recopa' AND status = 'active' ORDER BY id DESC LIMIT 1")
    if (!active) return Response.json({ error: 'No hay recopa activa' }, { status: 404 })
    tid = active.id
  }

  const match = await dbGet(
    "SELECT * FROM matches WHERE tournament_id = ? AND match_key = 'recopa-final'",
    [tid]
  )
  if (!match) {
    return Response.json({ error: 'Partido no encontrado' }, { status: 404 })
  }

  // Determinar ganador
  let winner = null
  const isDraw = Number(home_goals) === Number(away_goals)

  if (!isDraw) {
    winner = Number(home_goals) > Number(away_goals) ? match.home : match.away
  } else {
    // Empate: necesita penalty_winner
    if (!penalty_winner || (penalty_winner !== match.home && penalty_winner !== match.away)) {
      return Response.json({ error: 'En caso de empate, indicá el ganador por penales.' }, { status: 400 })
    }
    winner = penalty_winner
  }

  // Guardar resultado
  await dbRun(
    "UPDATE matches SET home_goals = ?, away_goals = ?, played = 1, penalty_winner = ?, home_penalties = ?, away_penalties = ? WHERE tournament_id = ? AND match_key = 'recopa-final'",
    [
      home_goals, away_goals,
      isDraw ? winner : null,
      isDraw ? (home_penalties ?? null) : null,
      isDraw ? (away_penalties ?? null) : null,
      tid,
    ]
  )

  // Finalizar la recopa
  await dbRun(
    "UPDATE tournaments SET status = 'finished', champion = ?, finished_at = ? WHERE id = ?",
    [winner, new Date().toISOString(), tid]
  )

  console.log(`🏆 Recopa ${tid} finalizada — Campeón: ${winner}`)

  return Response.json({
    ok: true,
    message: `🏆 ¡Recopa finalizada! Campeón: ${winner}`,
    winner,
    isDraw,
    finished: true,
  })
}
