import { app } from "./app.ts";
import { config } from "./config/env.ts";
import { db } from "./config/database.ts";
import { processAssetDeletions } from "./services/asset-cleanup.service.ts";
import { reconcilePayments } from "./services/payment.service.ts";

const server = app.listen(config.PORT, "0.0.0.0", () => console.log(`Server running on: http://localhost:${config.PORT}`));
let cleaning = false;
const cleanup = setInterval(async () => {
  if (cleaning) return;
  cleaning = true;
  try {
    await processAssetDeletions();
  } catch {
    console.error({ event: "asset_cleanup_unavailable" });
  } finally {
    cleaning = false;
  }
}, 60_000).unref();
let expiring = false;
async function expirePayments() {
  if (expiring) return;
  expiring = true;
  try {
    if (config.STRIPE_SECRET_KEY) {
      const result = await reconcilePayments();
      if (result.failures) console.error({ event: "payment_reconciliation_incomplete", failures: result.failures });
    }
  } catch {
    console.error({ event: "payment_expiry_unavailable" });
  } finally {
    expiring = false;
  }
}
void expirePayments();
const paymentCleanup = setInterval(expirePayments, 60_000).unref();
async function shutdown() {
  clearInterval(cleanup);
  clearInterval(paymentCleanup);
  server.close(async () => {
    await db.$disconnect();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
