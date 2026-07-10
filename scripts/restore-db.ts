/**
 * Script de restauración de la base de datos desde un backup.
 *
 * Uso:
 *   npx tsx scripts/restore-db.ts backups/backup-2024-01-15T10-30-00.json
 *
 * ⚠️  CUIDADO: Esto REEMPLAZA todos los datos actuales de la DB.
 */

import { createClient } from '@libsql/client'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'

async function restore() {
  // Determinar qué archivo restaurar
  let backupFile = process.argv[2]

  if (!backupFile) {
    // Si no se pasa archivo, mostrar los disponibles
    const backupDir = join(process.cwd(), 'backups')
    try {
      const files = readdirSync(backupDir)
        .filter(f => f.startsWith('backup-') && f.endsWith('.json'))
        .sort()

      if (files.length === 0) {
        console.error('❌ No hay backups disponibles en /backups')
        process.exit(1)
      }

      console.log('📁 Backups disponibles:')
      files.forEach((f, i) => console.log(`   ${i + 1}. ${f}`))
      console.log('')
      console.log('Uso: npx tsx scripts/restore-db.ts backups/<archivo>')
      console.log(`Ej:  npx tsx scripts/restore-db.ts backups/${files[files.length - 1]}`)
      process.exit(0)
    } catch {
      console.error('❌ No existe el directorio /backups')
      process.exit(1)
    }
  }

  // Leer el backup
  console.log(`🔄 Leyendo backup: ${backupFile}`)
  const raw = readFileSync(backupFile, 'utf-8')
  const backup = JSON.parse(raw)

  console.log(`   📅 Fecha del backup: ${backup.timestamp}`)
  console.log(`   📊 Torneos: ${backup.counts.tournaments}`)
  console.log(`   👥 Jugadores: ${backup.counts.tournament_players}`)
  console.log(`   ⚽ Partidos: ${backup.counts.matches}`)
  console.log('')

  // Conectar a la DB
  const url = process.env.TURSO_DATABASE_URL || 'file:torneo.db'
  const authToken = process.env.TURSO_AUTH_TOKEN || undefined

  const db = createClient({ url, authToken })

  console.log('⚠️  Eliminando datos actuales...')

  // Borrar datos actuales (en orden por foreign keys)
  await db.execute('DELETE FROM matches')
  await db.execute('DELETE FROM tournament_players')
  await db.execute('DELETE FROM tournaments')

  // Restaurar tournaments
  console.log('🔄 Restaurando torneos...')
  for (const t of backup.data.tournaments) {
    await db.execute({
      sql: `INSERT INTO tournaments (id, name, season, year, type, status, champion, top_scorer, top_scorer_goals, created_at, finished_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        t.id, t.name, t.season, t.year, t.type || 'league', t.status,
        t.champion || null, t.top_scorer || null, t.top_scorer_goals || 0,
        t.created_at || null, t.finished_at || null
      ]
    })
  }

  // Restaurar tournament_players
  console.log('🔄 Restaurando jugadores...')
  for (const p of backup.data.tournament_players) {
    await db.execute({
      sql: `INSERT INTO tournament_players (id, tournament_id, name, disabled, seed_position)
            VALUES (?, ?, ?, ?, ?)`,
      args: [p.id, p.tournament_id, p.name, p.disabled || 0, p.seed_position || 0]
    })
  }

  // Restaurar matches
  console.log('🔄 Restaurando partidos...')
  for (const m of backup.data.matches) {
    await db.execute({
      sql: `INSERT INTO matches (id, tournament_id, match_key, round, stage, home, away, home_goals, away_goals, played, penalty_winner, home_penalties, away_penalties)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        m.id, m.tournament_id, m.match_key, m.round, m.stage || null,
        m.home, m.away, m.home_goals, m.away_goals, m.played || 0,
        m.penalty_winner || null, m.home_penalties || null, m.away_penalties || null
      ]
    })
  }

  console.log('')
  console.log('✅ Restauración completada!')
  console.log(`   Se restauraron ${backup.counts.tournaments} torneos, ${backup.counts.tournament_players} jugadores y ${backup.counts.matches} partidos.`)
}

restore().catch(err => {
  console.error('❌ Error restaurando:', err)
  process.exit(1)
})
