import { createClient } from '@libsql/client'

let _db = null

export function getDb() {
  if (_db) return _db

  // En producción (Vercel): usa Turso con URL + auth token
  // En local: usa archivo SQLite local
  const url = process.env.TURSO_DATABASE_URL || 'file:torneo.db'
  const authToken = process.env.TURSO_AUTH_TOKEN || undefined

  _db = createClient({ url, authToken })
  return _db
}

// Helper: ejecutar una query y devolver todas las filas
export async function dbAll(sql, args = []) {
  const db = getDb()
  const result = await db.execute({ sql, args })
  return result.rows
}

// Helper: ejecutar una query y devolver la primera fila
export async function dbGet(sql, args = []) {
  const db = getDb()
  const result = await db.execute({ sql, args })
  return result.rows[0] || null
}

// Helper: ejecutar un statement (INSERT/UPDATE/DELETE)
export async function dbRun(sql, args = []) {
  const db = getDb()
  const result = await db.execute({ sql, args })
  return result
}

// Inicializar esquema
export async function initSchema() {
  const db = getDb()
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS tournaments (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT NOT NULL,
      season        TEXT NOT NULL,
      year          INTEGER NOT NULL,
      type          TEXT NOT NULL DEFAULT 'league' CHECK(type IN ('league', 'copa')),
      status        TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'finished')),
      champion      TEXT,
      top_scorer    TEXT,
      top_scorer_goals INTEGER DEFAULT 0,
      created_at    TEXT DEFAULT (datetime('now')),
      finished_at   TEXT
    );

    CREATE TABLE IF NOT EXISTS tournament_players (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      tournament_id INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
      name          TEXT NOT NULL,
      disabled      INTEGER DEFAULT 0,
      seed_position INTEGER DEFAULT 0,
      UNIQUE(tournament_id, name)
    );

    CREATE TABLE IF NOT EXISTS matches (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      tournament_id INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
      match_key     TEXT NOT NULL,
      round         INTEGER NOT NULL,
      stage         TEXT DEFAULT NULL,
      home          TEXT NOT NULL,
      away          TEXT NOT NULL,
      home_goals    INTEGER,
      away_goals    INTEGER,
      played        INTEGER DEFAULT 0,
      UNIQUE(tournament_id, match_key)
    );
  `)

  // Agregar columnas nuevas si no existen (migraciones)
  try { await db.execute("ALTER TABLE tournaments ADD COLUMN type TEXT NOT NULL DEFAULT 'league' CHECK(type IN ('league', 'copa'))") } catch (e) { /* ya existe */ }
  try { await db.execute("ALTER TABLE tournament_players ADD COLUMN seed_position INTEGER DEFAULT 0") } catch (e) { /* ya existe */ }
  try { await db.execute("ALTER TABLE matches ADD COLUMN stage TEXT DEFAULT NULL") } catch (e) { /* ya existe */ }
  try { await db.execute("ALTER TABLE matches ADD COLUMN penalty_winner TEXT DEFAULT NULL") } catch (e) { /* ya existe */ }
  try { await db.execute("ALTER TABLE matches ADD COLUMN home_penalties INTEGER DEFAULT NULL") } catch (e) { /* ya existe */ }
  try { await db.execute("ALTER TABLE matches ADD COLUMN away_penalties INTEGER DEFAULT NULL") } catch (e) { /* ya existe */ }
}
