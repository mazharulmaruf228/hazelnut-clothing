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

Unit tests check pricing/validation, signed raw-body webhook verification, the
HTTP perimeter, and architecture. `npm run test:integration` applies migrations
and runs real PostgreSQL workflows against the guarded `_test` database with
mocked providers. Never point these tests at a customer database.

## Stripe Sandbox Payments

Checkout supports cash on delivery and Stripe-hosted Checkout for one-time BDT
payments. COD keeps manual review. Verified paid Stripe webhooks auto-confirm
orders and consume reserved stock exactly once. Stripe orders cannot be edited
or manually confirmed through the COD review API.

1. Apply `npm run db:deploy` to the intended development/staging database.
2. Store a sandbox restricted API key in `STRIPE_SECRET_KEY` privately. Grant
   Checkout Session create/read/expire, PaymentIntent read, and Refund create/read
   access, plus the product/price permissions needed by inline Checkout pricing.
   Keep keys out of chat, Git, frontend variables, and logs. CLI login is separate
   from the backend API key. Live keys/events are deliberately rejected.
3. Run `stripe listen --latest --forward-to http://localhost:4000/api/webhooks/stripe`.
   Enter the listener's signing secret directly into local `STRIPE_WEBHOOK_SECRET`;
   it is not the same as a Dashboard endpoint's secret. Do not share it in chat.
4. Set `STRIPE_ENABLED=true`, confirm `PUBLIC_ORIGIN` matches the frontend URL,
   and restart the API. Both payment methods now appear. Disabled Stripe does not
   silently turn a Stripe request into COD. Existing webhook/refund handling stays
   available when new Stripe checkout is disabled.
5. Use Stripe test cards on the app-created hosted Checkout. Test success,
   decline, 3DS, browser back, a closed return page, expiry, duplicate events, and
   a full admin cancellation/refund. Never use real cards in the sandbox.

SDK/API version: Stripe Node 23.2 / `2026-11-18.endive`. Use matching snapshot
webhook events. Subscribe to `checkout.session.completed`,
`checkout.session.expired`, `checkout.session.async_payment_succeeded`,
`checkout.session.async_payment_failed`, `refund.created`, `refund.updated`,
`refund.failed`, and `charge.refunded`. The webhook must receive original bytes,
not JSON reserialized by a proxy. Signatures and test mode are verified before
processing; browser return parameters never establish payment success.

Amounts use server-side catalogue snapshots plus district delivery charges and
integer poisha. Adaptive Pricing is disabled to keep fixed BDT prices. Initially
only cards and eligible card wallets are allowed; delayed methods are excluded.
Managed Payments is explicitly disabled, including when enabled by default on
the Stripe account, because this is a direct physical-goods checkout.
The guest's random checkout key provides idempotency and token-protected status
access; the database stores only its hash, not the key. Checkout Sessions expire
after one hour. Unknown provider outcomes preserve reservations for recovery;
definitively rejected session creation releases them. The browser cancel URL
alone does not expire a still-payable Checkout Session.

Schedule `node dist/payments-reconcile.js` every five minutes using the same API
database and Stripe secrets; locally use `npm run payments:reconcile`. The job
recovers missed events/session linkage, safely expires abandoned unpaid orders,
and retries interrupted refunds. It emits counts only and exits nonzero when any
operation needs retry. Monitor failures and `paymentReviewRequired` orders.
Concurrent workers and replayed events cannot consume/release/restore stock twice.

ADMIN can cancel a confirmed Stripe order only after attesting it has not shipped.
Cancellation restores stock once and persists a full-refund request before calling
Stripe. Refund status is separate from cancellation; never promise success while
pending or failed. Dashboard full refunds are reconciled but do not automatically
restock confirmed orders without the unshipped attestation. External partial
refunds require staff investigation; partial-refund UI is outside this scope.

This is sandbox-only. Bangladesh is not currently listed as a supported Stripe
business-account country. Live activation requires a separate eligibility,
account-currency, legal, and rollout review. BDT sandbox success does not establish
live availability. Rollback disables new Stripe checkout but must retain webhook,
reconciliation, and refund processing for existing payments and all order history.
