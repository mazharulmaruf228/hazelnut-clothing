import { spawnSync } from "node:child_process";
import argon2 from "argon2";

const url = process.env.TEST_DATABASE_URL || "postgresql://catalogue:change-me@127.0.0.1:55432/catalogue_test?schema=public";
if (!new URL(url).pathname.endsWith("_test")) throw new Error("Browser fixtures require a database ending in _test");
process.env.DATABASE_URL = url;
process.env.NODE_ENV = "test";
const migrated = spawnSync(process.platform === "win32" ? "npx.cmd" : "npx", ["prisma", "migrate", "deploy"], { stdio: "inherit", env: process.env, shell: process.platform === "win32" });
if (migrated.status !== 0) process.exit(migrated.status || 1);
const { db } = await import("../src/config/database.ts");
await db.$executeRawUnsafe('TRUNCATE "AssetDeletion", "ProductImage", "ProductVariant", "Product", "Category", "AdminSession", "OAuthIdentity", "AdminUser" CASCADE');
await import("../prisma/seed.ts");
try {
  const passwordHash = await argon2.hash("Catalogue-e2e-password-123!");
  for (const role of ["ADMIN", "EDITOR"] as const)
    await db.adminUser.create({
      data: {
        name: `Test ${role}`,
        email: `test-${role.toLowerCase()}@example.invalid`,
        role,
        isActive: true,
        approvedAt: new Date(),
        passwordHash,
      },
    });
  console.log("Isolated browser fixtures prepared. Never use these accounts outside a test database.");
} finally {
  await db.$disconnect();
}
