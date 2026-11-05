import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

if (process.env.NODE_ENV === "production") throw new Error("This launcher is development-only");
const databaseDir = resolve(".postgres");
const postgres = new EmbeddedPostgres({
  databaseDir,
  user: "catalogue",
  password: "change-me",
  port: Number(process.env.LOCAL_PG_PORT || 5432),
  persistent: true,
  authMethod: "scram-sha-256",
  autoRehydrateSymlinks: true,
  postgresFlags: ["-h", "127.0.0.1"],
  initdbFlags: ["--encoding=UTF8", "--locale=C"],
});
if (!existsSync(resolve(databaseDir, "PG_VERSION"))) await postgres.initialise();
await postgres.start();
const client = postgres.getPgClient();
await client.connect();
for (const name of ["catalogue", "catalogue_test"]) {
  const found = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [name]);
  if (!found.rowCount) await client.query(`CREATE DATABASE "${name}"`);
}
await client.end();
console.log(`Development PostgreSQL ready on 127.0.0.1:${process.env.LOCAL_PG_PORT || 5432}. Stop with Ctrl+C.`);
let stopping = false;
async function shutdown() {
  if (stopping) return;
  stopping = true;
  await postgres.stop();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
