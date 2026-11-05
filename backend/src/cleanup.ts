import { processAssetDeletions } from "./services/asset-cleanup.service.ts";
import { db } from "./config/database.ts";
try {
  await processAssetDeletions();
} finally {
  await db.$disconnect();
}
