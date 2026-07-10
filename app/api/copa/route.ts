import { NextRequest } from 'next/server'
import { dbAll, dbGet, dbRun, initSchema } from '../../lib/db'
import { requireAuth } from '../../lib/auth'
import { generateCopaBracket, resolveCopaBracket, getCopaChampion } from '../../lib/fixture'
import type { CopaBracketMatch } from '../../types'

// GET /api/copa — obtener la copa activa (o la más reciente) — público
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
    [tournament.id as number]
  )

  const matchRows = await dbAll(
    'SELECT match_key, round, stage, home, away, home_goals, away_goals, played, penalty_winner, home_penalties, away_penalties FROM matches WHERE tournament_id = ? ORDER BY round, id',
    [tournament.id as number]
  )

  let matches: CopaBracketMatch[] = matchRows.map(m => ({
    id: m.match_key as string,
    stage: m.stage as string,
    round: m.round as number,
    home: (m.home as string) ?? 'TBD',
    away: (m.away as string) ?? 'TBD',
    homeGoals: m.home_goals as number | null,
    awayGoals: m.away_goals as number | null,
    played: !!m.played,
    penaltyWinner: (m.penalty_winner as string) ?? null,
    homePenalties: (m.home_penalties as number) ?? null,
    awayPenalties: (m.away_penalties as number) ?? null,
  }))

  const seedMap: Record<string, number> = {}
  for (const p of players) {
    seedMap[p.name as string] = p.seed_position as number
  }

  matches = resolveCopaBracket(matches, seedMap)
  const champion = getCopaChampion(matches)

  return Response.json({
    tournament,
    players: players.map(p => ({ name: p.name, seed: p.seed_position })),
    matches,
    champion,
    exists: true,
  })
}

// POST /api/copa — crear una copa nueva basada en standings del torneo de liga (requiere auth)
export async function POST(request: NextRequest) {
  const authError = await requireAuth()
  if (authError) return authError

  await initSchema()
  const body = await request.json()
  const { name, season, year, standings } = body

  if (!name || !season || !year || !standings || standings.length < 6) {
    return Response.json({ error: 'Se necesitan al menos 6 jugadores con posiciones' }, { status: 400 })
  }

  if (typeof name !== 'string' || typeof season !== 'string') {
    return Response.json({ error: 'Campos name y season deben ser texto' }, { status: 400 })
  }

  const bracketMatches = generateCopaBracket(standings)

  const result = await dbRun(
    "INSERT INTO tournaments (name, season, year, type, status) VALUES (?, ?, ?, 'copa', 'active')",
    [name.trim(), season.trim(), Number(year)]
  )
  const tid = Number(result.lastInsertRowid)

  for (let i = 0; i < standings.length; i++) {
    const playerName = standings[i].name || standings[i]
    await dbRun(
      'INSERT INTO tournament_players (tournament_id, name, seed_position) VALUES (?, ?, ?)',
      [tid, playerName, i + 1]
    )
  }

  for (const m of bracketMatches) {
    await dbRun(
      'INSERT INTO matches (tournament_id, match_key, round, stage, home, away, home_goals, away_goals, played) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [tid, m.id, m.round, m.stage, m.home, m.away, null, null, 0]
    )
  }

  return Response.json({ id: tid, message: 'Copa creada exitosamente' }, { status: 201 })
}
