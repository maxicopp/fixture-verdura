#!/bin/bash
# Script wrapper para el cron de backup.
# Carga las variables de entorno desde .env y ejecuta el backup.

set -e

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$PROJECT_DIR/.env"
NPX="$HOME/.nvm/versions/node/v24.16.0/bin/npx"

# Cargar variables del .env (ignorar comentarios y líneas vacías)
if [ -f "$ENV_FILE" ]; then
  export $(grep -v '^#' "$ENV_FILE" | grep -v '^$' | xargs)
fi

cd "$PROJECT_DIR"
echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] Iniciando backup..."
"$NPX" tsx scripts/backup-db.ts
echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] Backup completado."
