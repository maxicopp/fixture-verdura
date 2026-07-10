import { dbAll, dbRun, initSchema } from '../../lib/db'
import { requireAuth } from '../../lib/auth'

// GET /api/tournaments — lista todos los torneos (público)
export async function GET() {
  await initSchema()
  const tournaments = await dbAll(`
    SELECT id, name, season, year, type, status, champion, top_scorer, top_scorer_goals, created_at, finished_at
    FROM tournaments ORDER BY year DESC, id DESC
  `)
  return Response.json(tournaments)
}

// POST /api/tournaments — crear un nuevo torneo (requiere auth)
export async function POST(request) {
  const authError = await requireAuth()
  if (authError) return authError

  await initSchema()
  const body = await request.json()
  const { name, season, year, players } = body

  if (!name || !season || !year || !players?.length) {
    return Response.json({ error: 'Faltan campos requeridos' }, { status: 400 })
  }

  if (typeof name !== 'string' || typeof season !== 'string') {
    return Response.json({ error: 'Campos name y season deben ser texto' }, { status: 400 })
  }

  const yearNum = Number(year)
  if (!Number.isInteger(yearNum) || yearNum < 2000 || yearNum > 2100) {
    return Response.json({ error: 'Año inválido' }, { status: 400 })
  }

  if (!Array.isArray(players) || players.some(p => typeof p !== 'string' || p.trim().length === 0)) {
    return Response.json({ error: 'Lista de jugadores inválida' }, { status: 400 })
  }

  const result = await dbRun(
    "INSERT INTO tournaments (name, season, year, status) VALUES (?, ?, ?, 'active')",
    [name.trim(), season.trim(), yearNum]
  )
  const tid = Number(result.lastInsertRowid)

  for (const p of players) {
    await dbRun('INSERT INTO tournament_players (tournament_id, name) VALUES (?, ?)', [tid, p.trim()])
  }

  return Response.json({ id: tid, message: 'Torneo creado' }, { status: 201 })
}
