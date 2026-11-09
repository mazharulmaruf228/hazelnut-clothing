# Clothing Catalogue

Next.js storefront and CMS with a separate Express REST API, Prisma/PostgreSQL,
Cloudinary media and email/password plus Google admin authentication. BDT is the
single currency. Guest cart, inventory reservations, and manual order review are
available; online payments and delivery integrations are not yet included.

## Structure

```text
frontend/          Independent Next.js package, lockfile, scripts and Dockerfile
backend/           Independent Express package, lockfile, scripts and Dockerfile
  prisma/          Schema, committed SQL migrations and development seed
  src/
    routes/        URL/middleware registration
    controllers/   HTTP parsing, cookies and responses
    services/      Business rules and transaction orchestration
    models/        Prisma queries
    validators/    Zod inputs; distinct create and PATCH schemas
    middleware/    Authentication, CSRF, uploads, rate limits and errors
    config/        Environment and database lifecycle
    integrations/  Provider adapters
    utils/         Small pure helpers
infra/             Caddy, backup/restore and deployment scripts
.github/workflows/ Independent CI checks and manual deployment
```

There is no root npm package, workspace or shared source package. Frontend DTOs
and form schemas are local; backend validation is authoritative. REST schema
compatibility is checked through real browser/API tests. See backend/openapi.yaml.

## Local Development (Windows, macOS or Linux)

Use Node 22.18+ and npm. Each command below runs inside the specified package.

1. In `backend`, run `npm ci` and `npm run db:generate`.
2. Set local environment variables using `backend/.env.example` as the template.
   Development defaults work without provider credentials. Keep `.env` untracked.
3. In a separate terminal, run `npm run dev:db` from `backend`. This development-only
   launcher runs PostgreSQL on **127.0.0.1:55432**, stores data in ignored
   `backend/.postgres`, and creates `catalogue` and `catalogue_test`. It never
   provisions system users or exposes the database on the LAN. Use an existing
   PostgreSQL installation instead by setting `DATABASE_URL`/`TEST_DATABASE_URL`.
4. From `backend`, run `npm run db:deploy`, `npm run db:seed`, then `npm run dev`.
   The idempotent development seed creates clothing products, not admin users.
5. From `frontend`, run `npm ci`, then `npm run dev`. Optional frontend configuration
   is listed in `frontend/.env.example`.
6. Open **http://localhost:3000**; CMS login is **/admin/login**; API is on port 4000.

If ports are occupied, change `PORT`/`API_INTERNAL_URL`/`PUBLIC_ORIGIN` together.
Frontend and API use same-origin `/api` requests through Next rewrites in development
and Caddy in production. PostgreSQL is never accessed by the frontend.

For mobile testing through an ngrok tunnel to port 3000, set
`NEXT_PUBLIC_SITE_URL` in the frontend's local `.env` to the tunnel's HTTPS URL.
Next.js allows that hostname for development connections; without it, the page
can render but remain non-interactive because its development WebSocket is blocked.
Restart the frontend dev server if it does not reload the configuration, then
reload the page on the phone. Update this value whenever the tunnel URL changes,
and restore `http://localhost:3000` when returning to local-only development.
This only configures the frontend; CMS authentication through the tunnel also
requires the backend's `PUBLIC_ORIGIN` to match.

### First Administrator

From `backend`, set `ADMIN_PASSWORD` in your own terminal environment (at least
12 characters), run `npm run admin:create`, and answer the email/name prompts.
The command never accepts a password on the command line and there is no default
production password. Remove `ADMIN_PASSWORD` from your environment afterward.
Use the CMS to add additional ADMIN/EDITOR users.

### Providers

- **Cloudinary:** set cloud name, API key and API secret only in the backend.
  Uploads accept up to eight 8 MB JPEG/PNG/WebP/AVIF images; actual bytes are decoded,
  pixel dimensions limited, metadata stripped and images re-encoded as WebP.
  Deletions are queued transactionally and retried every minute. Run
  `npm run assets:cleanup` for a manual batch. Monitor retry log events/table growth.
- **Google:** configure OAuth web client, consent screen and the exact callback
  `http://localhost:3000/api/auth/google/callback` (HTTPS domain in production).
  New verified identities become inactive EDITOR accounts pending ADMIN approval.
  Existing local accounts are never linked by email alone; sign in with a password,
  then use Account -> Link Google account. Unconfigured Google login reports that
  it is unavailable; it does not bypass authentication.
- Seed photographs are externally hosted Unsplash examples for development.
  Replace them with your licensed product photographs in Cloudinary before launch.

## Catalogue Rules

- Product price is required. A null variant override inherits it. Product discounts
  apply to all resolved variant prices; amounts travel as decimal strings and are
  calculated/rounded on the backend, not with browser floating-point arithmetic.
- Every product has one active default variant. Default reassignment is atomic;
  default/last variant removal is blocked until another default is chosen.
- Attributes are a bounded dynamic key/value map such as size/color/material.
  Duplicate normalized combinations and global duplicate SKUs are rejected.
- Save a draft before uploading images. Publishing requires an active default and
  usable imagery. Variant images fall back to product images.
- Only published products and active variants are public. Draft/archive detail
  requests return 404. SSR uses uncached API reads so publishing changes appear
  immediately. The catalogue loads/sorts matching records in memory by effective
  price; this intentionally targets the agreed catalogue of fewer than 500 products.
- EDITOR manages and publishes catalogue data. Only ADMIN manages users/approvals.
  The last active ADMIN cannot be disabled, demoted or deleted.
- Category deletion is restricted while products/children refer to it; reassign
  those records first. Reparenting checks for cycles inside serialized mutations.

## Commerce Rules

- The guest cart is stored in the browser. Order submission sends variant IDs and
  quantities only; the API rechecks published/active state and calculates prices.
- Stock is tracked per variant. New orders reserve stock atomically and enter
  `PENDING_REVIEW`; admin confirmation consumes the reservation, while rejection
  releases it. Pending reservations do not expire automatically yet.
- Existing products start with zero stock after migration. Set stock in the
  product's variant editor before accepting orders. The development seed assigns
  ten units to newly created demo variants.
- Orders are unpaid. Delivery charges are not calculated in checkout; admins
  must confirm delivery details with the customer before confirming the order.
- `backend/openapi.yaml` documents the public order submission and admin review
  endpoints. No customer accounts, payment processing, or carrier integration is
  included in this stage.

## Verification

From `backend`: `npm run typecheck`, `npm test`, `npm run build`.
With PostgreSQL running: `npm run test:integration`.
`npm run test:restore` verifies a local custom-format dump and isolated restore
with matching row counts; it is not an encrypted off-server storage test.
It requires PostgreSQL 18 client utilities installed on PATH (or the standard
Windows install location); `PG_DUMP_BIN` and `PG_RESTORE_BIN` can override them.
From `frontend`: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.

For browser tests, run `npm run test:prepare-e2e` from `backend`, then
`npx playwright install chromium` and `npm run test:e2e` from `frontend`.
Fixtures are destructive **only in the dedicated `_test` database**. The browser
suite starts temporary API/web servers on 4100/3100, tests desktop/mobile, saves
screenshots under ignored test-results and checks the independent REST contract.
Do not run integration and browser suites concurrently against the same test DB.
Test-only logins are created solely by the guarded fixture script; they are not
development or production accounts.

Google and Cloudinary are mocked in deterministic integration tests. A real-provider
sandbox test is still required with your own credentials. Docker image builds,
Compose boot and off-server restore require Docker/storage access and must be run
before production; local source/build tests alone do not certify infrastructure.

## Production

For managed hosting, see [Railway deployment](infra/RAILWAY.md). For a Docker VPS,
see [Hetzner deployment and recovery](infra/DEPLOYMENT.md). Configuration and local
build checks do not provision hosting or certify a live production deployment.
