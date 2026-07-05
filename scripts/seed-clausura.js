/**
 * Seed script — crea el torneo Clausura 2026 con fixture generado.
 * 
 * Uso LOCAL:
 *   node scripts/seed-clausura.js
 * 
 * Uso PRODUCCIÓN (Turso):
 *   TURSO_DATABASE_URL=libsql://... TURSO_AUTH_TOKEN=... node scripts/seed-clausura.js
 * 
 * ⚠️  NO borra torneos anteriores. Inserta el Clausura como torneo nuevo activo.
 *     El torneo activo anterior (Apertura) debe estar finalizado para que la app
 *     muestre el Clausura como torneo actual.
 */

import { createClient } from '@libsql/client'

const url       = process.env.TURSO_DATABASE_URL || 'file:torneo.db'
const authToken = process.env.TURSO_AUTH_TOKEN   || undefined

const db = createClient({ url, authToken })

// ─── Jugadores ────────────────────────────────────────────────────────────────
const PLAYERS = ['Max', 'Gayco', 'Vulvega', 'Nacho', 'Kevin', 'Negro']

// ─── Fisher-Yates shuffle ─────────────────────────────────────────────────────
function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ─── Round-robin fixture generator (ida + vuelta) ─────────────────────────────
function generateFixture(players) {
  const n      = players.length
  const rounds = []
  const list   = [...players]

  // Ida: n-1 fechas, 3 partidos cada una
  for (let round = 0; round < n - 1; round++) {
    const matches = []
    for (let i = 0; i < n / 2; i++) {
      matches.push({
        id:        `${round}-${i}`,
        home:      list[i],
        away:      list[n - 1 - i],
        homeGoals: null,
        awayGoals: null,
        played:    false,
      })
    }
    rounds.push({ round: round + 1, matches })
    // Rotación de jugadores (algoritmo berger)
    list.splice(1, 0, list.pop())
  }

  // Vuelta: mismos cruces con local/visitante invertidos
  const idaRounds = rounds.length
  for (let round = 0; round < idaRounds; round++) {
    const matches = rounds[round].matches.map((m, i) => ({
      id:        `v${round}-${i}`,
      home:      m.away,
      away:      m.home,
      homeGoals: null,
      awayGoals: null,
      played:    false,
    }))
    rounds.push({ round: idaRounds + round + 1, matches })
  }

  return rounds
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function seed() {
  console.log('🔄 Generando Clausura 2026...\n')

  // Migración preventiva
  try { await db.execute("ALTER TABLE tournaments ADD COLUMN type TEXT NOT NULL DEFAULT 'league' CHECK(type IN ('league','copa','recopa'))") } catch {}
  try { await db.execute("ALTER TABLE tournament_players ADD COLUMN seed_position INTEGER DEFAULT 0") } catch {}
  try { await db.execute("ALTER TABLE matches ADD COLUMN stage TEXT DEFAULT NULL") } catch {}

  // Marcar cualquier torneo de liga activo como finalizado (si corresponde)
  const active = await db.execute("SELECT id FROM tournaments WHERE type = 'league' AND status = 'active' ORDER BY id DESC LIMIT 1")
  if (active.rows.length > 0) {
    const aid = active.rows[0].id
    await db.execute({ sql: "UPDATE tournaments SET status = 'finished' WHERE id = ?", args: [aid] })
    console.log(`✅ Torneo anterior (id=${aid}) marcado como finalizado`)
  }

  // Sorteo de jugadores
  const shuffled = shuffle(PLAYERS)
  console.log(`🎲 Sorteo: ${shuffled.join(' · ')}`)

  // Crear torneo
  const res = await db.execute({
    sql: "INSERT INTO tournaments (name, season, year, type, status) VALUES (?, ?, ?, 'league', 'active')",
    args: ['Torneo Los Verduras', 'Clausura 2026', 2026],
  })
  const tid = Number(res.lastInsertRowid)
  console.log(`✅ Torneo creado (id=${tid})`)

  // Insertar jugadores
  for (const name of shuffled) {
    await db.execute({
      sql: 'INSERT INTO tournament_players (tournament_id, name) VALUES (?, ?)',
      args: [tid, name],
    })
  }
  console.log(`✅ ${shuffled.length} jugadores insertados`)

  // Generar fixture
  const fixture = generateFixture(shuffled)

  // Insertar partidos
  let matchCount = 0
  for (const round of fixture) {
    for (const m of round.matches) {
      await db.execute({
        sql: 'INSERT INTO matches (tournament_id, match_key, round, home, away, played) VALUES (?, ?, ?, ?, ?, 0)',
        args: [tid, m.id, round.round, m.home, m.away],
      })
      matchCount++
    }
  }
  console.log(`✅ ${matchCount} partidos insertados (${fixture.length} fechas)`)

  console.log(`\n🎉 Clausura 2026 listo!`)
  console.log('\nFixture generado:')
  for (const round of fixture) {
    console.log(`  Fecha ${round.round}: ${round.matches.map(m => `${m.home} vs ${m.away}`).join(' | ')}`)
  }
}

seed().catch(err => {
  console.error('❌ Error:', err.message)
  process.exit(1)
})
