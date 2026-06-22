import { cookies } from 'next/headers'
import { dbGet, dbAll, dbRun, initSchema } from '../../../lib/db'
import { calcStandings } from '../../../lib/fixture'

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

  // Obtener torneo activo si no se especifica
  let tid = tournament_id
  if (!tid) {
    const active = await dbGet("SELECT id FROM tournaments WHERE status = 'active' ORDER BY id DESC LIMIT 1")
    if (!active) return Response.json({ error: 'No hay torneo activo' }, { status: 404 })
    tid = active.id
  }

  // Guardar resultado
  await dbRun(
    'UPDATE matches SET home_goals = ?, away_goals = ?, played = 1 WHERE tournament_id = ? AND match_key = ?',
    [home_goals, away_goals, tid, match_key]
  )

  // ── Chequear si el torneo terminó ──────────────────────────────────────
  const pending = await dbGet(
    'SELECT COUNT(*) as c FROM matches WHERE tournament_id = ? AND played = 0',
    [tid]
  )

  let finished = false
  if (Number(pending.c) === 0) {
    // Todos los partidos jugados — calcular campeón desde standings
    const players = await dbAll(
      'SELECT name FROM tournament_players WHERE tournament_id = ? AND disabled = 0 ORDER BY id',
      [tid]
    )
    const matchRows = await dbAll(
      'SELECT match_key, round, home, away, home_goals, away_goals, played FROM matches WHERE tournament_id = ? ORDER BY round, id',
      [tid]
    )

    // Armar fixture para calcStandings
    const roundsMap = {}
    for (const m of matchRows) {
      if (!roundsMap[m.round]) roundsMap[m.round] = { round: m.round, matches: [] }
      roundsMap[m.round].matches.push({
        id: m.match_key, home: m.home, away: m.away,
        homeGoals: m.home_goals, awayGoals: m.away_goals, played: !!m.played,
      })
    }
    const fixture = Object.values(roundsMap).sort((a, b) => a.round - b.round)
    const playerNames = players.map(p => p.name)
    const standings = calcStandings(playerNames, fixture)

    const champion = standings[0]
    const topScorer = [...standings].sort((a, b) => b.gf - a.gf)[0]

    await dbRun(
      "UPDATE tournaments SET status = 'finished', champion = ?, top_scorer = ?, top_scorer_goals = ?, finished_at = ? WHERE id = ?",
      [champion.name, topScorer?.name || null, topScorer?.gf || 0, new Date().toISOString(), tid]
    )

    finished = true
    console.log(`🏆 Torneo ${tid} finalizado — Campeón: ${champion.name}`)
  }

  return Response.json({
    ok: true,
    message: 'Resultado guardado',
    ...(finished && { finished: true, message: '🏆 ¡Torneo finalizado!' }),
  })
}
