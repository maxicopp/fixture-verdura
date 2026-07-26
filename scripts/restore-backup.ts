import { createClient } from '@libsql/client'
import * as fs from 'fs'

const backupPath = process.argv[2] || './backups/backup-2026-07-10T20-53-39-473Z.json'

async function restore() {
  const url = process.env.TURSO_DATABASE_URL
  const authToken = process.env.TURSO_AUTH_TOKEN

  if (!url || !authToken) {
    console.error('Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN')
    process.exit(1)
  }

  const db = createClient({ url, authToken })

  console.log('Reading backup file:', backupPath)
  const backup = JSON.parse(fs.readFileSync(backupPath, 'utf-8'))

  console.log('Clearing existing data...')
  await db.execute('DELETE FROM matches')
  await db.execute('DELETE FROM tournament_players')
  await db.execute('DELETE FROM tournaments')

  console.log('Restoring tournaments...')
  for (const t of backup.data.tournaments) {
    await db.execute({
      sql: `INSERT INTO tournaments (id, name, season, year, type, status, champion, top_scorer, top_scorer_goals, created_at, finished_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [t.id, t.name, t.season, t.year, t.type, t.status, t.champion, t.top_scorer, t.top_scorer_goals, t.created_at, t.finished_at]
    })
  }
  console.log(`  Restored ${backup.data.tournaments.length} tournaments`)

  console.log('Restoring players...')
  for (const p of backup.data.tournament_players) {
    await db.execute({
      sql: `INSERT INTO tournament_players (id, tournament_id, name, disabled, seed_position)
            VALUES (?, ?, ?, ?, ?)`,
      args: [p.id, p.tournament_id, p.name, p.disabled, p.seed_position]
    })
  }
  console.log(`  Restored ${backup.data.tournament_players.length} players`)

  console.log('Restoring matches...')
  for (const m of backup.data.matches) {
    await db.execute({
      sql: `INSERT INTO matches (id, tournament_id, match_key, round, home, away, home_goals, away_goals, played, stage)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [m.id, m.tournament_id, m.match_key, m.round, m.home, m.away, m.home_goals, m.away_goals, m.played, m.stage]
    })
  }
  console.log(`  Restored ${backup.data.matches.length} matches`)

  console.log('Done!')
}

restore().catch(console.error)
