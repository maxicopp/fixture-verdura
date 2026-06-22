import { dbAll, dbGet, dbRun, initSchema } from '../../lib/db'
import { generateCopaBracket, resolveCopaBracket, getCopaChampion } from '../../lib/fixture'

// GET /api/copa — obtener la copa activa (o la más reciente)
export async function GET() {
  await initSchema()

  let tournament = await dbGet(
    "SELECT * FROM tournaments WHERE type = 'copa' AND status = 'active' ORDER BY id DESC LIMIT 1"
  )

  if (!tournament) {
    tournament = await dbGet(
      "SELECT * FROM tournaments WHERE type = 'copa' ORDER BY id DESC LIMIT 1"
    )
  }

  if (!tournament) {
    return Response.json({ error: 'No hay copa', exists: false }, { status: 404 })
  }

  const players = await dbAll(
    'SELECT name, seed_position FROM tournament_players WHERE tournament_id = ? ORDER BY seed_position ASC',
    [tournament.id]
  )

  const matchRows = await dbAll(
    'SELECT match_key, round, stage, home, away, home_goals, away_goals, played, penalty_winner, home_penalties, away_penalties FROM matches WHERE tournament_id = ? ORDER BY round, id',
    [tournament.id]
  )

  // Convertir a formato de bracket
  let matches = matchRows.map(m => ({
    id: m.match_key,
    stage: m.stage,
    round: m.round,
    home: m.home,
    away: m.away,
    homeGoals: m.home_goals,
    awayGoals: m.away_goals,
    played: !!m.played,
    penaltyWinner: m.penalty_winner ?? null,
    homePenalties: m.home_penalties ?? null,
    awayPenalties: m.away_penalties ?? null,
  }))

  // Crear seedMap para resolver empates
  const seedMap = {}
  for (const p of players) {
    seedMap[p.name] = p.seed_position
  }

  // Resolver TBDs con ganadores actuales
  matches = resolveCopaBracket(matches, seedMap)

  const champion = getCopaChampion(matches, seedMap)

  return Response.json({
    tournament,
    players: players.map(p => ({ name: p.name, seed: p.seed_position })),
    matches,
    champion,
    exists: true,
  })
}

// POST /api/copa — crear una copa nueva basada en standings del torneo de liga
export async function POST(request) {
  await initSchema()
  const body = await request.json()
  const { name, season, year, standings } = body

  if (!name || !season || !year || !standings || standings.length < 6) {
    return Response.json({ error: 'Se necesitan al menos 6 jugadores con posiciones' }, { status: 400 })
  }

  // Generar bracket
  const bracketMatches = generateCopaBracket(standings)

  // Crear torneo tipo copa
  const result = await dbRun(
    "INSERT INTO tournaments (name, season, year, type, status) VALUES (?, ?, ?, 'copa', 'active')",
    [name, season, year]
  )
  const tid = Number(result.lastInsertRowid)

  // Insertar jugadores con su posición de seed
  for (let i = 0; i < standings.length; i++) {
    const playerName = standings[i].name || standings[i]
    await dbRun(
      'INSERT INTO tournament_players (tournament_id, name, seed_position) VALUES (?, ?, ?)',
      [tid, playerName, i + 1]
    )
  }

  // Insertar partidos
  for (const m of bracketMatches) {
    await dbRun(
      'INSERT INTO matches (tournament_id, match_key, round, stage, home, away, home_goals, away_goals, played) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [tid, m.id, m.round, m.stage, m.home, m.away, null, null, 0]
    )
  }

  return Response.json({ id: tid, message: 'Copa creada exitosamente' }, { status: 201 })
}
