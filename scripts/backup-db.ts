/**
 * Script de backup de la base de datos.
 * Exporta todas las tablas a un archivo JSON con timestamp.
 *
 * Uso:
 *   npx tsx scripts/backup-db.ts
 *
 * Los backups se guardan en /backups con formato:
 *   backup-2024-01-15T10-30-00.json
 */

import { createClient } from '@libsql/client'
import { writeFileSync, mkdirSync, readdirSync, unlinkSync } from 'fs'
import { join } from 'path'

const MAX_BACKUPS = 10 // Mantener los últimos 10 backups

async function backup() {
  const url = process.env.TURSO_DATABASE_URL || 'file:torneo.db'
  const authToken = process.env.TURSO_AUTH_TOKEN || undefined

  const db = createClient({ url, authToken })

  console.log('🔄 Conectando a la base de datos...')
  console.log(`   URL: ${url.startsWith('libsql://') ? url.split('.')[0] + '...' : url}`)

  // Exportar todas las tablas
  const tournaments = (await db.execute('SELECT * FROM tournaments')).rows
  const players = (await db.execute('SELECT * FROM tournament_players')).rows
  const matches = (await db.execute('SELECT * FROM matches')).rows

  const backup = {
    timestamp: new Date().toISOString(),
    version: '1.0',
    data: {
      tournaments,
      tournament_players: players,
      matches,
    },
    counts: {
      tournaments: tournaments.length,
      tournament_players: players.length,
      matches: matches.length,
    },
  }

  // Crear directorio de backups
  const backupDir = join(process.cwd(), 'backups')
  mkdirSync(backupDir, { recursive: true })

  // Nombre del archivo con timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const filename = `backup-${timestamp}.json`
  const filepath = join(backupDir, filename)

  writeFileSync(filepath, JSON.stringify(backup, null, 2), 'utf-8')

  console.log('')
  console.log('✅ Backup completado!')
  console.log(`   📁 Archivo: backups/${filename}`)
  console.log(`   📊 Torneos: ${backup.counts.tournaments}`)
  console.log(`   👥 Jugadores: ${backup.counts.tournament_players}`)
  console.log(`   ⚽ Partidos: ${backup.counts.matches}`)

  // Limpiar backups viejos (mantener los últimos MAX_BACKUPS)
  const files = readdirSync(backupDir)
    .filter(f => f.startsWith('backup-') && f.endsWith('.json'))
    .sort()

  if (files.length > MAX_BACKUPS) {
    const toDelete = files.slice(0, files.length - MAX_BACKUPS)
    for (const file of toDelete) {
      unlinkSync(join(backupDir, file))
      console.log(`   🗑️  Eliminado backup viejo: ${file}`)
    }
  }

  console.log('')
}

backup().catch(err => {
  console.error('❌ Error haciendo backup:', err)
  process.exit(1)
})
