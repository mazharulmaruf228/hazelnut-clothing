#!/bin/sh
set -eu
umask 077
mkdir -p /state
printf '0 2 * * * /backup/backup.sh >> /proc/1/fd/1 2>> /proc/1/fd/2\n' > /etc/crontabs/root
/backup/backup.sh || true
exec crond -f -l 2