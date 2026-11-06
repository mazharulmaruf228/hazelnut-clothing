import EmbeddedPostgres from "embedded-postgres";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";

if (process.env.NODE_ENV === "production") throw new Error("This launcher is development-only");
const databaseDir = resolve(".postgres");
const port = Number(process.env.LOCAL_PG_PORT || 55432);

// A shutdown/reboot without Ctrl+C leaves a stale lock file that blocks the next start.
const pidFile = resolve(databaseDir, "postmaster.pid");
if (existsSync(pidFile)) {
  const pid = Number(readFileSync(pidFile, "utf8").split(/\r?\n/)[0]);
  let alive = false;
  try {
    process.kill(pid, 0);
    alive = true;
  } catch {}
  if (alive) throw new Error(`PostgreSQL already appears to be running (PID ${pid}) for ${databaseDir}`);
  rmSync(pidFile);
  console.log("Removed stale postmaster.pid from previous unclean shutdown.");
}

const postgres = new EmbeddedPostgres({
  databaseDir,
  user: "catalogue",
  password: "change-me",
  port,
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
console.log(`Development PostgreSQL ready on 127.0.0.1:${port}. Stop with Ctrl+C.`);
let stopping = false;
async function shutdown() {
  if (stopping) return;
  stopping = true;
  await postgres.stop();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
