/**
 * Sincroniza la DB local (torneo.db) con los datos de Turso.
 * Borra todo lo local y re-inserta desde la remota.
 */
import { createClient } from '@libsql/client'
import path from 'path'

const TURSO_URL   = process.env.TURSO_DATABASE_URL || 'libsql://verdura-torneo-maxicopp.aws-us-east-1.turso.io'
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN

if (!TURSO_TOKEN) {
  console.error('❌ Falta TURSO_AUTH_TOKEN')
  process.exit(1)
}

const remote = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN })
const local  = createClient({ url: `file:${path.join(process.cwd(), 'torneo.db')}` })

async function run() {
  console.log('🔄 Sincronizando desde Turso...\n')

  // ── Crear esquema local ────────────────────────────────────────────────
  await local.executeMultiple(`
    CREATE TABLE IF NOT EXISTS tournaments (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, season TEXT NOT NULL,
      year INTEGER NOT NULL, type TEXT NOT NULL DEFAULT 'league',
      status TEXT NOT NULL DEFAULT 'active', champion TEXT,
      top_scorer TEXT, top_scorer_goals INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')), finished_at TEXT
    );
    CREATE TABLE IF NOT EXISTS tournament_players (
      id INTEGER PRIMARY KEY AUTOINCREMENT, tournament_id INTEGER NOT NULL, name TEXT NOT NULL,
      disabled INTEGER DEFAULT 0, seed_position INTEGER DEFAULT 0,
      UNIQUE(tournament_id, name)
    );
    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT, tournament_id INTEGER NOT NULL,
      match_key TEXT NOT NULL, round INTEGER NOT NULL, stage TEXT DEFAULT NULL,
      home TEXT NOT NULL, away TEXT NOT NULL,
      home_goals INTEGER, away_goals INTEGER, played INTEGER DEFAULT 0,
      UNIQUE(tournament_id, match_key)
    );
  `)

  // ── Limpiar local ──────────────────────────────────────────────────────
  await local.executeMultiple(`
    DELETE FROM matches;
    DELETE FROM tournament_players;
    DELETE FROM tournaments;
  `)
  console.log('🗑️  DB local limpiada')

  // ── Leer desde Turso ───────────────────────────────────────────────────
  const { rows: tournaments } = await remote.execute('SELECT * FROM tournaments ORDER BY id')
  const { rows: players }     = await remote.execute('SELECT * FROM tournament_players ORDER BY id')
  const { rows: matches }     = await remote.execute('SELECT * FROM matches ORDER BY id')

  console.log(`📥 Turso: ${tournaments.length} torneos, ${players.length} jugadores, ${matches.length} partidos`)

  // ── Insertar en local ──────────────────────────────────────────────────
  for (const t of tournaments) {
    await local.execute({
      sql: `INSERT INTO tournaments (id, name, season, year, type, status, champion, top_scorer, top_scorer_goals, created_at, finished_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [t.id, t.name, t.season, t.year, t.type ?? 'league', t.status, t.champion ?? null, t.top_scorer ?? null, t.top_scorer_goals ?? 0, t.created_at ?? null, t.finished_at ?? null],
    })
  }
  console.log(`✅ ${tournaments.length} torneos insertados`)

  for (const p of players) {
    await local.execute({
      sql: `INSERT INTO tournament_players (id, tournament_id, name, disabled, seed_position) VALUES (?, ?, ?, ?, ?)`,
      args: [p.id, p.tournament_id, p.name, p.disabled ?? 0, p.seed_position ?? 0],
    })
  }
  console.log(`✅ ${players.length} jugadores insertados`)

  for (const m of matches) {
    await local.execute({
      sql: `INSERT INTO matches (id, tournament_id, match_key, round, stage, home, away, home_goals, away_goals, played) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [m.id, m.tournament_id, m.match_key, m.round, m.stage ?? null, m.home, m.away, m.home_goals ?? null, m.away_goals ?? null, m.played ?? 0],
    })
  }
  console.log(`✅ ${matches.length} partidos insertados`)

  console.log('\n🎉 Sincronización completa. DB local = Turso.')
}

run().catch(err => {
  console.error('❌ Error:', err.message)
  process.exit(1)
})
