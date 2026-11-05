# Hetzner Deployment and Recovery

## Operator Prerequisites

- A supported Linux Hetzner VPS with Docker Engine and Compose v2, SSH access,
  sufficient disk, and a domain pointing to its public IP. Start with at least
  2 vCPU/4 GB RAM and monitor actual workload/disk usage.
- Firewall: public 80/443 only for web traffic; SSH limited to trusted addresses.
  Never publish port 5432, 3000 or 4000. Do not mount the Docker socket in services.
- Cloudinary account, Google OAuth web client and off-server S3-compatible bucket.
  Google callback is `https://YOUR_DOMAIN/api/auth/google/callback`.
- Install the project at `/opt/catalogue`, owned by the deployment user. Docker
  group access is root-equivalent: secure that account/key accordingly.
- Put production variables from `.env.production.example` into a protected `.env`
  (`chmod 600`). Use a long random **hex** database password so the URL needs no
  extra encoding, and an independent 32+ character JWT secret. Never commit secrets.
- Generate an age identity **outside the VPS**, retain its private key securely
  offline, and configure only the public `AGE_RECIPIENT` on the server. Loss of
  the private key makes encrypted backups unrecoverable.

## First Deployment

1. Review `docker compose --env-file .env config --quiet` and build with
   `docker compose --env-file .env build`. Do not print resolved config into logs.
2. Run `docker compose --env-file .env up -d --wait`. PostgreSQL health gates
   migration deployment; successful migrations gate API startup; API gates Next.
3. Verify `https://YOUR_DOMAIN/api/ready`, storefront images and login. Caddy
   obtains/renews HTTPS certificates automatically; certificate data persists.
4. Bootstrap the first ADMIN inside the API container:
   `docker compose exec -e ADMIN_PASSWORD api node dist/bootstrap.js` after setting
   `ADMIN_PASSWORD` privately in the host terminal. Email/name are prompted. Unset
   the variable afterward; never put the password into shell command history.
5. Check backup logs and confirm a dump, checksum and manifest exist **off-server**.
   Connect the alert webhook and external container-health monitoring before launch.
6. Test real Cloudinary upload/assignment/deletion and Google signup, ADMIN approval,
   subsequent login and authenticated linking. Verify EDITOR cannot manage users.

All containers log to bounded json-file logs. PostgreSQL uses a named persistent
volume. PostgreSQL 18 persists at `/var/lib/postgresql`; do not change its major
version without a dump/restore or a reviewed `pg_upgrade` procedure.

## CI/CD

CI installs and tests each package separately; it runs real PostgreSQL integration
tests, desktop/mobile browser journeys, application builds and image builds. A
separate manual deployment workflow uses the GitHub `production` environment.

Configure required reviewers and restrict deployment to commits whose CI passed.
Add environment secrets `SSH_HOST`, `SSH_USER`, `SSH_PRIVATE_KEY` and
`SSH_KNOWN_HOSTS` (verified host key, not runtime TOFU). The host must already be
authenticated to GHCR for private images with a least-privilege read-only token,
or the image packages must be public. The workflow never provisions a server.

The workflow builds immutable SHA-tagged images, copies Compose/infra files and
runs `infra/deploy.sh`. That script takes a verified encrypted pre-migration backup,
applies `prisma migrate deploy` and waits for service health. It records release
image references and attempts an application rollback if health fails. It **does
not reverse database migrations**. All schema changes must use expand/contract
compatibility across adjacent releases. A breaking migration needs its own reviewed
maintenance/recovery procedure; never run `prisma db push` in production.

## Daily Encrypted Off-Server Backups

The backup service takes a custom-format pg_dump at startup and **02:00 UTC daily**,
encrypts it with age, uploads to a dedicated bucket/prefix with rclone, verifies the
uploaded ciphertext/checksum/manifest and applies the configured retention (30 days
by default). Plaintext temporary files are removed on exit. The healthcheck fails
when no successful backup exists within 26 hours; configure external alerts for
unhealthy containers as well as `BACKUP_ALERT_URL` failure callbacks.

Give storage credentials only list/read/write/delete within the chosen backup
prefix. Use a provider lifecycle rule as a second retention guard. Put immutable
backup copies or object locking under separate credentials if required. The VPS
must not hold the age private key. PostgreSQL credentials are never CLI arguments.

Manual backup: `docker compose run --rm --no-deps --entrypoint /backup/backup.sh backup`.
Monitor storage capacity, last-success timestamp, upload verification and retries.
Daily backups imply up to 24h data loss; restore time must be measured, not assumed.

## Restore Drill

Use a non-production environment, PostgreSQL 18 tooling and an empty database
ending in `_restore`. Obtain the age private key through a secure out-of-band
channel and mount it read-only temporarily. Do not store it in the repository.

```sh
docker compose run --rm --no-deps --entrypoint createdb backup catalogue_restore
docker compose run --rm --no-deps \
  -e PGDATABASE=catalogue_restore \
  -e RESTORE_FILE=catalogue-TIMESTAMP.dump.age \
  -e AGE_IDENTITY_FILE=/run/age/key \
  -v /secure/offline-key:/run/age/key:ro \
  --entrypoint /backup/restore.sh backup
```

The script downloads only the named dump/checksum, verifies SHA-256, decrypts and
restores transactionally. It refuses to target the production database name.
Compare table/variant/image counts and constraints; point a separate API instance
at the restored DB and read published products. Measure recovery time and record
the drill. Remove the mounted key after the drill.

For actual disaster recovery, restore into a fresh environment, verify it, then
switch the application connection/DNS under a reviewed maintenance procedure.
Database backups contain image references, **not Cloudinary image binaries**;
retain Cloudinary originals/backups through its own storage policy. Preserve the
deployment configuration and Caddy volumes securely as separate recovery assets.

## Required Pre-Launch Checks

Run all CI gates, `docker compose up --build --wait`, restart PostgreSQL and verify
persistence, complete an off-server restore drill, verify real-provider auth/media,
and test HTTPS and access restrictions from outside the VPS. Do not claim these
checks passed merely because configuration files or mocked tests exist.
