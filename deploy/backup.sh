#!/bin/sh
# Runs in the backup container: dump the database now and every 24 hours, keep 14 days.
# Run once by hand with: docker compose -f docker-compose.prod.yml exec backup /bin/sh /scripts/backup.sh once
set -eu
export PGPASSWORD="$POSTGRES_PASSWORD"
dump() {
  file="/backups/ferrin-$(date +%Y%m%d-%H%M%S).sql.gz"
  pg_dump -h db -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "$file.tmp" && mv "$file.tmp" "$file"
  find /backups -name 'ferrin-*.sql.gz' -mtime +14 -delete
  echo "backup written: $file"
}
if [ "${1:-}" = "once" ]; then dump; exit 0; fi
while true; do dump || echo "backup failed"; sleep 86400; done
