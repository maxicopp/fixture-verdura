import { cookies } from 'next/headers'
import { dbGet, dbAll, dbRun, initSchema } from '../../../lib/db'
import { resolveCopaBracket, getCopaChampion } from '../../../lib/fixture'

const SESSION_TOKEN = 'verdura-admin-session'

async function isAuthed() {
  const cookieStore = await cookies()
  return !!cookieStore.get(SESSION_TOKEN)?.value
}

/**
 * En caso de empate, clasifica el que mejor estaba en la tabla de la liga
 * (el que tiene seed_position más bajo).
 */
async function resolveWinner(home, away, homeGoals, awayGoals, tid) {
  if (homeGoals > awayGoals) return home
  if (awayGoals > homeGoals) return away

  // Empate — gana el que tiene mejor seed (número más bajo)
  const homeSeed = await dbGet(
    'SELECT seed_position FROM tournament_players WHERE tournament_id = ? AND name = ?',
    [tid, home]
  )
  const awaySeed = await dbGet(
    'SELECT seed_position FROM tournament_players WHERE tournament_id = ? AND name = ?',
    [tid, away]
  )
  const hs = homeSeed?.seed_position ?? 99
  const as = awaySeed?.seed_position ?? 99
  return hs <= as ? home : away
}

// POST /api/copa/save-result
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

  // Obtener torneo copa activo
  let tid = tournament_id
  if (!tid) {
    const active = await dbGet("SELECT id FROM tournaments WHERE type = 'copa' AND status = 'active' ORDER BY id DESC LIMIT 1")
    if (!active) return Response.json({ error: 'No hay copa activa' }, { status: 404 })
    tid = active.id
  }

  // Verificar que el partido puede jugarse (no tiene dependencias sin resolver)
  const match = await dbGet(
    'SELECT * FROM matches WHERE tournament_id = ? AND match_key = ?',
    [tid, match_key]
  )
  if (!match) {
    return Response.json({ error: 'Partido no encontrado' }, { status: 404 })
  }

  if (match.home === 'TBD' || match.away === 'TBD') {
    return Response.json({ error: 'Este partido depende de resultados anteriores' }, { status: 400 })
  }

  // Guardar resultado
  await dbRun(
    'UPDATE matches SET home_goals = ?, away_goals = ?, played = 1 WHERE tournament_id = ? AND match_key = ?',
    [home_goals, away_goals, tid, match_key]
  )

  // Determinar ganador (en empate, clasifica el mejor posicionado en la liga)
  const winner = await resolveWinner(match.home, match.away, home_goals, away_goals, tid)
  const isDraw = home_goals === away_goals

  if (match_key === 'qf1') {
    await dbRun(
      "UPDATE matches SET away = ? WHERE tournament_id = ? AND match_key = 'sf1'",
      [winner, tid]
    )
  } else if (match_key === 'qf2') {
    await dbRun(
      "UPDATE matches SET away = ? WHERE tournament_id = ? AND match_key = 'sf2'",
      [winner, tid]
    )
  } else if (match_key === 'sf1') {
    await dbRun(
      "UPDATE matches SET home = ? WHERE tournament_id = ? AND match_key = 'final'",
      [winner, tid]
    )
  } else if (match_key === 'sf2') {
    await dbRun(
      "UPDATE matches SET away = ? WHERE tournament_id = ? AND match_key = 'final'",
      [winner, tid]
    )
  }

  // Chequear si la copa terminó (final jugada)
  let finished = false
  if (match_key === 'final') {
    const allCopaMatches = await dbAll(
      'SELECT home, away, home_goals, away_goals FROM matches WHERE tournament_id = ? AND played = 1',
      [tid]
    )
    const goalMap = {}
    for (const m of allCopaMatches) {
      goalMap[m.home] = (goalMap[m.home] || 0) + m.home_goals
      goalMap[m.away] = (goalMap[m.away] || 0) + m.away_goals
    }
    const topScorer = Object.entries(goalMap).sort((a, b) => b[1] - a[1])[0]

    await dbRun(
      "UPDATE tournaments SET status = 'finished', champion = ?, top_scorer = ?, top_scorer_goals = ?, finished_at = ? WHERE id = ?",
      [winner, topScorer?.[0] || null, topScorer?.[1] || 0, new Date().toISOString(), tid]
    )
    finished = true
    console.log(`🏆 Copa ${tid} finalizada — Campeón: ${winner}`)
  }

  return Response.json({
    ok: true,
    message: finished ? '🏆 ¡Copa finalizada!' : 'Resultado guardado',
    winner,
    isDraw,
    finished,
  })
}
