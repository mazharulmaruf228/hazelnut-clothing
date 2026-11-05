#!/bin/sh
set -eu
umask 077
: "${API_IMAGE:?}" "${WEB_IMAGE:?}"
case "$API_IMAGE:$WEB_IMAGE" in *[!a-z0-9/:._-]*) echo "Invalid image references" >&2; exit 1 ;; esac
test -f .env
previous_api=
previous_web=
if [ -f .release.env ]; then
  previous_api=$(sed -n 's/^API_IMAGE=//p' .release.env)
  previous_web=$(sed -n 's/^WEB_IMAGE=//p' .release.env)
fi
docker compose pull api web migrate
docker compose up -d --wait --wait-timeout 120 postgres
docker compose build backup
docker compose run --rm --no-deps --entrypoint /backup/backup.sh backup
docker compose run --rm --no-deps migrate
if ! docker compose up -d --wait --wait-timeout 180 api web caddy backup; then
  echo "Release failed health checks. Attempting application rollback; database migrations are not reversed." >&2
  if [ -n "$previous_api" ] && [ -n "$previous_web" ]; then
    API_IMAGE="$previous_api" WEB_IMAGE="$previous_web" docker compose up -d --no-deps --wait api web
  fi
  exit 1
fi
if [ -f .release.env ]; then cp .release.env .previous-release.env; fi
printf 'API_IMAGE=%s\nWEB_IMAGE=%s\n' "$API_IMAGE" "$WEB_IMAGE" > .release.env
echo "Application release healthy. Verify the public domain and backup monitoring."