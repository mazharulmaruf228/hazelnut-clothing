import { reconcilePayments } from "./services/payment.service.ts";
import { db } from "./config/database.ts";

try {
  const result = await reconcilePayments();
  console.log(JSON.stringify(result));
  if (result.failures) process.exitCode = 1;
} finally {
  await db.$disconnect();
}
