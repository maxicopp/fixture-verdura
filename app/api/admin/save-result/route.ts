import { NextRequest } from 'next/server'
import { dbGet, dbAll, dbRun, initSchema } from '../../../lib/db'
import { requireAuth, isValidGoals } from '../../../lib/auth'
import { calcStandings } from '../../../lib/fixture'
import type { Round } from '../../../types'

// POST /api/admin/save-result
export async function POST(request: NextRequest) {
  const authError = await requireAuth()
  if (authError) return authError

  await initSchema()
  const body = await request.json()
  const { match_key, home_goals, away_goals, tournament_id } = body

  if (!match_key || !isValidGoals(home_goals) || !isValidGoals(away_goals)) {
    return Response.json({ error: 'Faltan campos o valores inválidos (goles deben ser enteros entre 0 y 99)' }, { status: 400 })
  }

  let tid = tournament_id
  if (!tid) {
    const active = await dbGet("SELECT id FROM tournaments WHERE status = 'active' ORDER BY id DESC LIMIT 1")
    if (!active) return Response.json({ error: 'No hay torneo activo' }, { status: 404 })
    tid = active.id
  }

  await dbRun(
    'UPDATE matches SET home_goals = ?, away_goals = ?, played = 1 WHERE tournament_id = ? AND match_key = ?',
    [Number(home_goals), Number(away_goals), tid, match_key]
  )

  // ── Chequear si el torneo terminó ──────────────────────────────────────
  const pending = await dbGet(
    'SELECT COUNT(*) as c FROM matches WHERE tournament_id = ? AND played = 0',
    [tid]
  )

  let finished = false
  if (Number((pending as unknown as { c: number }).c) === 0) {
    const players = await dbAll(
      'SELECT name FROM tournament_players WHERE tournament_id = ? AND disabled = 0 ORDER BY id',
      [tid]
    )
    const matchRows = await dbAll(
      'SELECT match_key, round, home, away, home_goals, away_goals, played FROM matches WHERE tournament_id = ? ORDER BY round, id',
      [tid]
    )

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
      })
    }
    const fixture = Object.values(roundsMap).sort((a, b) => a.round - b.round)
    const playerNames = players.map(p => p.name as string)
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
