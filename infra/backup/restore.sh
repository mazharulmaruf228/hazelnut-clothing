#!/bin/sh
set -eu
umask 077
: "${BACKUP_BUCKET:?}" "${BACKUP_PREFIX:?}" "${RESTORE_FILE:?}" "${AGE_IDENTITY_FILE:?}" "${PGDATABASE:?}"
case "$PGDATABASE" in *_restore) ;; *) echo "Restore only to an isolated database ending in _restore" >&2; exit 1 ;; esac
case "$RESTORE_FILE" in */*|*..*) echo "RESTORE_FILE must be a basename" >&2; exit 1 ;; esac
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
remote="backup:$BACKUP_BUCKET/$BACKUP_PREFIX"
rclone copyto "$remote/$RESTORE_FILE" "$work/$RESTORE_FILE"
rclone copyto "$remote/$RESTORE_FILE.sha256" "$work/$RESTORE_FILE.sha256"
(cd "$work" && sha256sum -c "$RESTORE_FILE.sha256")
age --decrypt --identity "$AGE_IDENTITY_FILE" --output "$work/database.dump" "$work/$RESTORE_FILE"
pg_restore --exit-on-error --single-transaction --no-owner --no-acl --dbname="$PGDATABASE" "$work/database.dump"
echo "Restore completed in isolated database $PGDATABASE. Verify counts, relations and application reads before recovery."