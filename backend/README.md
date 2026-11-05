# Catalogue API

Independent Express/TypeScript package. There are no npm workspaces or imports from the frontend.

## Architecture

```text
prisma/               PostgreSQL model definitions, migrations and seed
src/
  config/             Environment validation, Prisma initialization, transactions
  routes/             Paths, HTTP verbs and middleware composition only
  controllers/        Parse requests, call services, set cookies/status/responses
  services/           Business rules, authorization decisions and transactions
  models/             Prisma queries and persistence types
  validators/         Zod request schemas and distinct create/update contracts
  middleware/         Authentication, CSRF, rate limits, uploads, error mapping
  integrations/       External-provider adapters such as Cloudinary
  utils/              HTTP errors and decimal-safe money helpers
  app.ts              Express composition, without business/data logic
  server.ts           Process startup and graceful shutdown
  bootstrap.ts        Explicit first-admin CLI
```

Dependency direction: routes -> controllers -> services -> models -> Prisma.
Middleware may call services. Services are HTTP-independent and must not accept
Express request/response objects. Controllers must not query Prisma or invoke
provider SDKs. Only models and database lifecycle infrastructure use the Prisma
singleton. Services use the transaction helper and pass its client to models.
Prisma models in `prisma/schema.prisma` are authoritative; do not duplicate them
with an additional ORM. API payloads are validated and serialized separately.

`src/architecture.test.ts` checks these boundaries. Add new features to the
corresponding existing layers, not a combined router/controller/service file.

## Commands

Use Node 22.18 or newer. From this directory:

```sh
npm ci
npm run typecheck
npm test
npm run build
npm run dev
```

Set environment variables from `.env.example` in a local `.env`. Default
development API port is 4000. `/api/health` is liveness; `/api/ready` checks
PostgreSQL. Database-backed workflows need a running PostgreSQL instance.

The current tests check pure pricing/validation, HTTP perimeter and architecture
without a database. Real database/provider integration tests remain a subsequent
implementation step; passing these tests alone is not production certification.
