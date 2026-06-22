/**
 * Seed script — carga el torneo actual desde data.json.
 * Ejecutar con: node app/lib/seed.js
 *
 * Funciona tanto con SQLite local (dev) como con Turso (prod):
 *   - Local: TURSO_DATABASE_URL no definida → usa file:torneo.db
 *   - Turso: TURSO_DATABASE_URL=libsql://... TURSO_AUTH_TOKEN=...
 */
import { getDb, initSchema, dbRun, dbAll } from './db.js'
import { readFileSync } from 'fs'
import path from 'path'

async function seed() {
  await initSchema()

  // Limpiar todo
  await dbRun('DELETE FROM matches')
  await dbRun('DELETE FROM tournament_players')
  await dbRun('DELETE FROM tournaments')

  // Cargar data.json
  const dataPath = path.join(process.cwd(), 'public', 'data.json')
  const currentData = JSON.parse(readFileSync(dataPath, 'utf-8'))

  // Insertar torneo
  const result = await dbRun(
    "INSERT INTO tournaments (name, season, year, status) VALUES (?, ?, ?, 'active')",
    ['Torneo Los Verduras', 'Clausura 2026', 2026]
  )
  const tid = Number(result.lastInsertRowid)

  // Insertar jugadores
  for (const p of currentData.players) {
    await dbRun('INSERT INTO tournament_players (tournament_id, name) VALUES (?, ?)', [tid, p])
  }

  // Insertar partidos
  for (const round of currentData.fixture) {
    for (const m of round.matches) {
      await dbRun(
        'INSERT INTO matches (tournament_id, match_key, round, home, away, home_goals, away_goals, played) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [tid, m.id, round.round, m.home, m.away, m.played ? m.homeGoals : null, m.played ? m.awayGoals : null, m.played ? 1 : 0]
      )
    }
  }

  console.log('✅ Torneo actual (Clausura 2026) insertado.')
  console.log('🎉 Seed completo.')
}

seed().catch(err => {
  console.error('❌ Error en seed:', err)
  process.exit(1)
})
