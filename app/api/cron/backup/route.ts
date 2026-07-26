import { dbAll, initSchema } from '../../../lib/db'

// GET /api/cron/backup
// Llamado automáticamente por Vercel Cron cada 6 horas.
// Guarda un snapshot completo de Turso como JSON en un Gist de GitHub.
//
// Variables de entorno requeridas:
//   CRON_SECRET        — bearer token para autorizar la llamada
//   GITHUB_TOKEN       — personal access token con scope 'gist'
//   GITHUB_GIST_ID     — ID del gist donde se guardan los backups
//                        (crearlo manualmente la primera vez en gist.github.com)

export async function GET(request: Request) {
  // ── Autenticación ──────────────────────────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const githubToken = process.env.GITHUB_TOKEN
  const gistId      = process.env.GITHUB_GIST_ID

  if (!githubToken || !gistId) {
    return Response.json(
      { error: 'GITHUB_TOKEN y GITHUB_GIST_ID son requeridos' },
      { status: 500 }
    )
  }

  // ── Volcar la BD ───────────────────────────────────────────────────────────
  await initSchema()

  const [tournaments, players, matches] = await Promise.all([
    dbAll('SELECT * FROM tournaments ORDER BY id'),
    dbAll('SELECT * FROM tournament_players ORDER BY id'),
    dbAll('SELECT * FROM matches ORDER BY id'),
  ])

  const timestamp = new Date().toISOString()

  const snapshot = {
    timestamp,
    version: '1.0',
    counts: {
      tournaments: tournaments.length,
      tournament_players: players.length,
      matches: matches.length,
    },
    data: {
      tournaments,
      tournament_players: players,
      matches,
    },
  }

  // ── Leer el gist actual para preservar el historial ────────────────────────
  const getRes = await fetch(`https://api.github.com/gists/${gistId}`, {
    headers: {
      Authorization: `Bearer ${githubToken}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  })

  if (!getRes.ok) {
    const err = await getRes.text()
    console.error('Error leyendo gist:', err)
    return Response.json({ error: 'Error al leer el gist de GitHub', detail: err }, { status: 502 })
  }

  const gistData = await getRes.json() as { files: Record<string, { content: string }> }

  // Leer índice de backups existente (o inicializar vacío)
  const indexContent = gistData.files['index.json']?.content
  const index: { timestamp: string; filename: string }[] = indexContent
    ? JSON.parse(indexContent)
    : []

  // Nombre del nuevo archivo de backup (formato: backup-YYYY-MM-DDTHH-MM-SS.json)
  const safeTimestamp = timestamp.replace(/[:.]/g, '-')
  const filename = `backup-${safeTimestamp}.json`

  // Agregar al índice y mantener solo los últimos 28 backups (7 días × 4/día)
  index.push({ timestamp, filename })
  const MAX_BACKUPS = 28
  const toDelete = index.length > MAX_BACKUPS ? index.splice(0, index.length - MAX_BACKUPS) : []

  // ── Actualizar el gist (patch) ─────────────────────────────────────────────
  // Construir el objeto files: nuevo backup + índice actualizado + vaciar eliminados
  const files: Record<string, { content: string } | null> = {
    'index.json': { content: JSON.stringify(index, null, 2) },
    [filename]:   { content: JSON.stringify(snapshot, null, 2) },
  }

  // Eliminar backups viejos seteando su contenido a null (GitHub API)
  for (const old of toDelete) {
    files[old.filename] = null as unknown as { content: string }
  }

  const patchRes = await fetch(`https://api.github.com/gists/${gistId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${githubToken}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: JSON.stringify({
      description: `Backup automático Torneo Los Verduras — ${timestamp}`,
      files,
    }),
  })

  if (!patchRes.ok) {
    const err = await patchRes.text()
    console.error('Error actualizando gist:', err)
    return Response.json({ error: 'Error al guardar el backup en GitHub', detail: err }, { status: 502 })
  }

  console.log(`✅ Backup guardado: ${filename} (${matches.length} partidos, ${players.length} jugadores)`)

  return Response.json({
    ok: true,
    timestamp,
    filename,
    counts: snapshot.counts,
    totalBackups: index.length,
    deleted: toDelete.length,
  })
}
