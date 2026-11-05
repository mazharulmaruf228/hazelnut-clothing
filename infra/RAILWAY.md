# Railway Deployment

Deploy three services in one Railway project: `Postgres`, `api`, and `web`.
Only `web` needs a public HTTPS domain. Railway hosting may incur charges;
review the plan and configure usage alerts before provisioning services.

## Current Deployment

- Project: `wonderful-nourishment`, environment: `production`.
- Storefront: https://hazelnut-clothing-production.up.railway.app
- CMS: https://hazelnut-clothing-production.up.railway.app/admin/login
- Services: `hazelnut-clothing` (frontend), `api`, and `Postgres` (PostgreSQL 18).
- The application was deployed from local source using the Railway CLI. Both
  Docker builds and service health checks passed. Public readiness, products,
  categories, login, and storefront routes returned HTTP 200. Unauthenticated
  admin access redirected to login.
- The production catalogue starts empty. No development data or administrator
  was seeded, and no local provider credentials were copied. Configure the first
  administrator, Cloudinary, optional Google login, and verified backups below.
- The frontend's build-time API URL fix must be committed and pushed before a
  future GitHub-sourced deployment. Local deployment does not update GitHub.
  The API currently uses CLI uploads rather than a connected GitHub source.

## Account and Source

1. Sign in to Railway with GitHub account `mazharulmaruf228` and authorize access
   to `mazharulmaruf228/hazelnut-clothing`.
2. Create an empty project and add PostgreSQL with persistent storage. Prefer
   PostgreSQL 18 to match CI. Enable database backups and verify recovery before
   storing production data.
3. Add two services from the same GitHub repository, named exactly `api` and `web`.
   Configure each service before deploying; the initial import may fail until
   variables and root directories are set.
4. Use root directory `/backend` for `api` and `/frontend` for `web`.
   Railway detects the Dockerfile inside each root. Leave custom build and start
   commands empty so the Dockerfiles control them.
5. In `web`, generate a Railway public domain targeting port `3000`. Use its full
   HTTPS URL, without a trailing slash, wherever `WEB_URL` appears below.

## API Settings

Set these variables on `api` in the Railway dashboard. Reference syntax assumes
the database service is named `Postgres`; adjust if it has another name.

| Variable              | Value                                                           |
| --------------------- | --------------------------------------------------------------- |
| `NODE_ENV`            | `production`                                                    |
| `PORT`                | `4000`                                                          |
| `DATABASE_URL`        | `${{Postgres.DATABASE_URL}}`                                    |
| `PUBLIC_ORIGIN`       | `WEB_URL`                                                       |
| `JWT_SECRET`          | Independently generated random secret of at least 32 characters |
| `GOOGLE_REDIRECT_URI` | `WEB_URL/api/auth/google/callback`                              |

Keep secrets in Railway variables, never in the repository or chat. Configure
`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` for
production image uploads. Configure `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
if Google login is required, and register the exact redirect URI with Google.
Password login works without Google credentials; image uploads require Cloudinary.

Set the **pre-deploy command** to `npm run db:deploy`, with a suitable timeout
such as 300 seconds. This applies committed migrations before API startup and
blocks deployment if they fail. Never use `prisma db push` in production.
Set the **healthcheck path** to `/api/ready` and timeout to 120 seconds.
Keep the API private; no public domain or TCP proxy is needed.

## Web Settings

| Variable                 | Value                                         |
| ------------------------ | --------------------------------------------- |
| `PORT`                   | `3000`                                        |
| `API_INTERNAL_URL`       | `http://${{api.RAILWAY_PRIVATE_DOMAIN}}:4000` |
| `NEXT_PUBLIC_SITE_URL`   | `WEB_URL`                                     |
| `NEXT_PUBLIC_STORE_NAME` | `Hazelnut`                                    |

Set the **healthcheck path** to `/admin/login` and timeout to 120 seconds.
Deploy `api` successfully before deploying `web`.

The frontend Dockerfile accepts the API URL and public settings at build time.
The API URL is also needed at runtime for server-rendered catalogue reads.
Redeploy `web` after changing any of these addresses: Next.js embeds its `/api`
proxy destination and public environment values during the build. Railway private
networking is available at runtime, not while building; the build must not depend
on fetching catalogue data. New Railway environments support IPv4 private networking,
matching the API's `0.0.0.0` listener.

Browsers call `/api` on the web domain; Next.js forwards requests to the private
API. This keeps authentication cookies same-origin without a separate API domain.
Do not deploy the Compose/Caddy services to Railway; Railway provides HTTPS and
public routing. The existing Hetzner workflow does not deploy to Railway.

## First Administrator and Verification

1. Temporarily add a strong `ADMIN_PASSWORD` (at least 12 characters) to the API's
   Railway variables. Apply the variable change.
2. Open a shell in the running API container (Railway SSH, not `railway run`,
   which runs locally). Run `node dist/bootstrap.js` and answer email/name prompts.
   Never pass the password on the command line. Remove `ADMIN_PASSWORD` afterward
   and apply that change.
3. Visit `WEB_URL/api/ready`, the storefront, and `WEB_URL/admin/login`. Log in,
   create a category/product, upload a real image, and publish the product.
   A fresh production database starts empty; development seed data is not deployed.
4. Test Google login if configured, verify database persistence after redeployment,
   and test a backup restore. Railway does not automatically run this repository's
   encrypted off-server backup service; arrange backups separately before launch.
5. When connecting GitHub auto-deploys, enable Railway's **Wait for CI** setting
   if available. Otherwise deploy manually only after the commit's CI succeeds.
   Application rollback does not undo database migrations; keep migrations
   compatible with the previous release.

## CLI Access

No global CLI installation is required:

```powershell
npx.cmd --yes @railway/cli login
npx.cmd --yes @railway/cli whoami
```

Complete authentication directly in your browser. Do not share Railway tokens,
passwords, or provider credentials in chat.
