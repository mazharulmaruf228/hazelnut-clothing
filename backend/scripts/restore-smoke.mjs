import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const url = new URL(process.env.TEST_DATABASE_URL || "postgresql://catalogue:change-me@127.0.0.1:55432/catalogue_test?schema=public");
if (!url.pathname.endsWith("_test")) throw new Error("Restore smoke tests require a dedicated _test source database");
const name = `catalogue_${Date.now()}_restore`;
const source = new PrismaClient({
  adapter: new PrismaPg({ connectionString: url.toString() }),
});
const restoreUrl = new URL(url);
restoreUrl.pathname = `/${name}`;
const restored = new PrismaClient({
  adapter: new PrismaPg({ connectionString: restoreUrl.toString() }),
});
const work = await mkdtemp(join(tmpdir(), "catalogue-restore-"));
let created = false;
const env = {
  ...process.env,
  PGHOST: url.hostname,
  PGPORT: url.port || "5432",
  PGUSER: decodeURIComponent(url.username),
  PGPASSWORD: decodeURIComponent(url.password),
  PGDATABASE: url.pathname.slice(1),
};
const platform = process.platform === "win32" ? "windows" : process.platform;
const native = fileURLToPath(new URL(`../node_modules/@embedded-postgres/${platform}-${process.arch}/native/bin/`, import.meta.url));
function run(tool, args) {
  const filename = `${tool}${process.platform === "win32" ? ".exe" : ""}`;
  const candidates = [join(native, filename)];
  if (process.platform === "win32") candidates.push(join(process.env.ProgramFiles || "C:\\Program Files", "PostgreSQL", "18", "bin", filename));
  const executable = process.env[`${tool.toUpperCase()}_BIN`] || candidates.find((candidate) => existsSync(candidate)) || tool;
  const result = spawnSync(executable, args, { env, stdio: "inherit" });
  if (result.status !== 0) throw new Error(`${tool} failed: ${result.error?.message || result.status}`);
}
async function counts(client) {
  return {
    products: await client.product.count(),
    variants: await client.productVariant.count(),
    images: await client.productImage.count(),
    categories: await client.category.count(),
    users: await client.adminUser.count(),
  };
}
try {
  const before = await counts(source);
  await source.$executeRawUnsafe(`CREATE DATABASE "${name}"`);
  created = true;
  const dump = join(work, "database.dump");
  run("pg_dump", ["--format=custom", "--no-owner", "--no-acl", `--file=${dump}`]);
  run("pg_restore", ["--exit-on-error", "--single-transaction", "--no-owner", "--no-acl", `--dbname=${name}`, dump]);
  const after = await counts(restored);
  if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error("Restored row counts do not match the source");
  console.log("Local PostgreSQL dump/restore verified:", after);
} finally {
  await restored.$disconnect();
  if (created) await source.$executeRawUnsafe(`DROP DATABASE "${name}"`);
  await source.$disconnect();
  await rm(work, { recursive: true, force: true });
}
