import "dotenv/config";
import { spawnSync } from "node:child_process";

const url = process.env.TEST_DATABASE_URL || "postgresql://catalogue:change-me@127.0.0.1:55432/catalogue_test?schema=public";
if (!new URL(url).pathname.endsWith("_test")) throw new Error("TEST_DATABASE_URL must point to a dedicated database ending in _test");
const env = {
  ...process.env,
  DATABASE_URL: url,
  TEST_DATABASE_URL: url,
  NODE_ENV: "test",
  CLOUDINARY_API_KEY: "integration-mock",
  GOOGLE_CLIENT_ID: "integration-client",
  GOOGLE_CLIENT_SECRET: "integration-secret",
};
const executable = process.platform === "win32" ? "npx.cmd" : "npx";
for (const args of [
  ["prisma", "migrate", "deploy"],
  ["vitest", "run", "--config", "vitest.integration.config.ts"],
]) {
  const result = spawnSync(executable, args, {
    stdio: "inherit",
    env,
    shell: process.platform === "win32",
  });
  if (result.status !== 0) process.exit(result.status || 1);
}
