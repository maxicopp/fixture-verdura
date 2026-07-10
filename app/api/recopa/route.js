import { dbAll, dbGet, dbRun, initSchema } from '../../lib/db'
import { requireAuth } from '../../lib/auth'

// GET /api/recopa — obtener la recopa activa (o la más reciente) — público
export async function GET() {
  await initSchema()

  let tournament = await dbGet(
    "SELECT * FROM tournaments WHERE type = 'recopa' AND status = 'active' ORDER BY id DESC LIMIT 1"
  )

  if (!tournament) {
    tournament = await dbGet(
      "SELECT * FROM tournaments WHERE type = 'recopa' ORDER BY id DESC LIMIT 1"
    )
  }

  if (!tournament) {
    // No hay recopa — devolver contexto para mostrar estado
    const lastLeague = await dbGet(
      "SELECT champion, season, year FROM tournaments WHERE type = 'league' AND status = 'finished' AND champion IS NOT NULL ORDER BY id DESC LIMIT 1"
    )
    const lastCopa = await dbGet(
      "SELECT champion, season, year, status FROM tournaments WHERE type = 'copa' ORDER BY id DESC LIMIT 1"
    )

    return Response.json({
      error: 'No hay recopa',
      exists: false,
      context: {
        leagueChampion: lastLeague?.champion || null,
        leagueSeason: lastLeague?.season || null,
        copaChampion: lastCopa?.champion || null,
        copaSeason: lastCopa?.season || null,
        copaStatus: lastCopa?.status || null,
      },
    }, { status: 404 })
  }

  const players = await dbAll(
    'SELECT name, seed_position FROM tournament_players WHERE tournament_id = ? ORDER BY seed_position ASC',
    [tournament.id]
  )

  const match = await dbGet(
    'SELECT match_key, round, stage, home, away, home_goals, away_goals, played, penalty_winner, home_penalties, away_penalties FROM matches WHERE tournament_id = ? AND match_key = ?',
    [tournament.id, 'recopa-final']
  )

  let matchData = null
  if (match) {
    matchData = {
      id: match.match_key,
      stage: match.stage,
      home: match.home,
      away: match.away,
      homeGoals: match.home_goals,
      awayGoals: match.away_goals,
      played: !!match.played,
      penaltyWinner: match.penalty_winner ?? null,
      homePenalties: match.home_penalties ?? null,
      awayPenalties: match.away_penalties ?? null,
    }
  }

  const champion = tournament.champion || null

  return Response.json({
    tournament,
    players: players.map(p => ({ name: p.name, seed: p.seed_position })),
    match: matchData,
    champion,
    exists: true,
  })
}

// POST /api/recopa — crear una recopa nueva (requiere auth)
// Body: { name, season, year, league_champion, copa_champion }
// Si ambos campeones son el mismo, se otorga automáticamente
export async function POST(request) {
  const authError = await requireAuth()
  if (authError) return authError

  await initSchema()
  const body = await request.json()
  const { name, season, year, league_champion, copa_champion } = body

  if (!name || !season || !year || !league_champion || !copa_champion) {
    return Response.json({ error: 'Faltan campos requeridos (name, season, year, league_champion, copa_champion)' }, { status: 400 })
  }

  if (typeof name !== 'string' || typeof season !== 'string' || typeof league_champion !== 'string' || typeof copa_champion !== 'string') {
    return Response.json({ error: 'Campos deben ser texto' }, { status: 400 })
  }

  // Verificar que no haya una recopa activa ya
  const existing = await dbGet("SELECT id FROM tournaments WHERE type = 'recopa' AND status = 'active'")
  if (existing) {
    return Response.json({ error: 'Ya existe una Recopa activa' }, { status: 400 })
  }

  // Si el mismo jugador ganó liga y copa, se le otorga automáticamente
  const autoWin = league_champion === copa_champion

  const status = autoWin ? 'finished' : 'active'
  const champion = autoWin ? league_champion : null
  const finishedAt = autoWin ? new Date().toISOString() : null

  const result = await dbRun(
    "INSERT INTO tournaments (name, season, year, type, status, champion, finished_at) VALUES (?, ?, ?, 'recopa', ?, ?, ?)",
    [name.trim(), season.trim(), Number(year), status, champion, finishedAt]
  )
  const tid = Number(result.lastInsertRowid)

  // Insertar los 2 jugadores
  const playersToInsert = autoWin
    ? [{ name: league_champion, seed: 1 }]
    : [
        { name: league_champion, seed: 1 },
        { name: copa_champion, seed: 2 },
      ]

  for (const p of playersToInsert) {
    await dbRun(
      'INSERT INTO tournament_players (tournament_id, name, seed_position) VALUES (?, ?, ?)',
      [tid, p.name, p.seed]
    )
  }

  // Crear el partido (o marcarlo como ya jugado si es auto-win)
  if (autoWin) {
    await dbRun(
      "INSERT INTO matches (tournament_id, match_key, round, stage, home, away, home_goals, away_goals, played, penalty_winner) VALUES (?, 'recopa-final', 1, 'final', ?, ?, NULL, NULL, 0, NULL)",
      [tid, league_champion, league_champion]
    )
  } else {
    await dbRun(
      "INSERT INTO matches (tournament_id, match_key, round, stage, home, away, home_goals, away_goals, played) VALUES (?, 'recopa-final', 1, 'final', ?, ?, NULL, NULL, 0)",
      [tid, league_champion, copa_champion]
    )
  }

  return Response.json({
    id: tid,
    message: autoWin
      ? `🏆 Recopa otorgada automáticamente a ${league_champion} (ganó Liga y Copa)`
      : 'Recopa creada exitosamente',
    autoWin,
    champion: autoWin ? league_champion : null,
  }, { status: 201 })
}
