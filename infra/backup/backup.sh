#!/bin/sh
set -eu
umask 077
: "${BACKUP_BUCKET:?}" "${BACKUP_PREFIX:?}" "${AGE_RECIPIENT:?}" "${PGDATABASE:?}"
case "$BACKUP_PREFIX" in ""|/|*..*) echo "Unsafe backup prefix" >&2; exit 1 ;; esac
case "${BACKUP_RETENTION_DAYS:-30}" in *[!0-9]*|"") echo "Invalid retention" >&2; exit 1 ;; esac
if [ "${BACKUP_RETENTION_DAYS:-30}" -lt 1 ]; then echo "Retention must be at least one day" >&2; exit 1; fi
work=$(mktemp -d)
cleanup() {
  result=$?
  rm -rf "$work"
  if [ "$result" -ne 0 ]; then
    echo "Database backup failed" >&2
    if [ -n "${BACKUP_ALERT_URL:-}" ]; then curl --fail --silent --show-error --max-time 15 -X POST -H 'Content-Type: application/json' --data '{"event":"catalogue_backup_failed"}' "$BACKUP_ALERT_URL" >/dev/null || true; fi
  fi
}
trap cleanup EXIT
name="$PGDATABASE-$(date -u +%Y%m%dT%H%M%SZ).dump.age"
remote="backup:$BACKUP_BUCKET/$BACKUP_PREFIX"
pg_dump --format=custom --no-owner --no-acl --file="$work/database.dump"
age --recipient "$AGE_RECIPIENT" --output "$work/$name" "$work/database.dump"
(cd "$work" && sha256sum "$name" > "$name.sha256")
printf '{"database":"%s","createdAt":"%s","format":"pg_dump-custom+age","postgresMajor":18}\n' "$PGDATABASE" "$(date -u +%FT%TZ)" > "$work/$name.json"
rclone copyto "$work/$name" "$remote/$name" --retries 3
rclone copyto "$work/$name.sha256" "$remote/$name.sha256" --retries 3
rclone copyto "$work/$name.json" "$remote/$name.json" --retries 3
rclone check "$work" "$remote" --include "$name" --include "$name.sha256" --include "$name.json" --one-way --download
rclone delete "$remote" --min-age "${BACKUP_RETENTION_DAYS:-30}d" --include '*.dump.age*'
date +%s > /state/last-success
echo "Encrypted off-server database backup completed: $name"