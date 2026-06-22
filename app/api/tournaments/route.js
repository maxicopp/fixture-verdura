import { dbAll, dbRun, initSchema } from '../../lib/db'

// GET /api/tournaments — lista todos los torneos
export async function GET() {
  await initSchema()
  const tournaments = await dbAll(`
    SELECT id, name, season, year, type, status, champion, top_scorer, top_scorer_goals, created_at, finished_at
    FROM tournaments ORDER BY year DESC, id DESC
  `)
  return Response.json(tournaments)
}

// POST /api/tournaments — crear un nuevo torneo
export async function POST(request) {
  await initSchema()
  const body = await request.json()
  const { name, season, year, players } = body

  if (!name || !season || !year || !players?.length) {
    return Response.json({ error: 'Faltan campos requeridos' }, { status: 400 })
  }

  const result = await dbRun(
    "INSERT INTO tournaments (name, season, year, status) VALUES (?, ?, ?, 'active')",
    [name, season, year]
  )
  const tid = Number(result.lastInsertRowid)

  for (const p of players) {
    await dbRun('INSERT INTO tournament_players (tournament_id, name) VALUES (?, ?)', [tid, p])
  }

  return Response.json({ id: tid, message: 'Torneo creado' }, { status: 201 })
}
