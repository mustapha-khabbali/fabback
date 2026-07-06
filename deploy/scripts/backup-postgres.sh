#!/bin/sh
set -eu

COMPOSE_FILE="${COMPOSE_FILE:-/opt/fablab/docker-compose.yml}"
PROJECT_DIR="${PROJECT_DIR:-$(dirname "$COMPOSE_FILE")}"
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_DIR/backups}"
POSTGRES_DB="${POSTGRES_DB:-fablab}"
POSTGRES_USER="${POSTGRES_USER:-fablab}"
KEEP_DAYS="${KEEP_DAYS:-14}"

mkdir -p "$BACKUP_DIR"
timestamp="$(date +%Y%m%d-%H%M%S)"
backup_file="$BACKUP_DIR/${POSTGRES_DB}-${timestamp}.dump"

cd "$PROJECT_DIR"
docker compose exec -T postgres pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -F c > "$backup_file"
find "$BACKUP_DIR" -type f -name "${POSTGRES_DB}-*.dump" -mtime +"$KEEP_DAYS" -delete
echo "Backup written to $backup_file"
