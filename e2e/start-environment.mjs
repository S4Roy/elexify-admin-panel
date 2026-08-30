import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Disposable, local-only admin E2E environment: its own mongod replica set,
// its own backend instance, its own `ng serve`. Mirrors
// elexify.online/e2e/start-environment.mjs exactly, on a distinct port range
// so it can run alongside (and never touches) the storefront's E2E
// environment, the developer's real dev server, or production.
const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "../..");
const backend = resolve(root, "elexify-backend");
const adminPanel = resolve(root, "elexify-admin-panel");
const mongoPort = "27139";
const backendPort = "4021";
const adminPort = "4221";
const replicaSet = "elexifyAdminE2ERs";
const mongoUri = `mongodb://127.0.0.1:${mongoPort}/elexify_e2e_admin?replicaSet=${replicaSet}`;
const dbPath = mkdtempSync(join(tmpdir(), "elexify-admin-e2e-rs-"));
const nodeBinary = process.env.E2E_NODE_BINARY || process.execPath;
const runtimePath = `${dirname(nodeBinary)}:${process.env.PATH || ""}`;
const children = [];

const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, { stdio: "inherit", ...options });
  if (result.status !== 0) throw new Error(`${command} ${args.join(" ")} failed`);
};
const waitFor = async (url, timeoutMs = 120_000) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try { await fetch(url); return; } catch { await new Promise((resolve) => setTimeout(resolve, 500)); }
  }
  throw new Error(`Timed out waiting for ${url}`);
};
const stop = () => {
  for (const child of children.reverse()) child.kill("SIGTERM");
  spawnSync("mongosh", ["--quiet", "--port", mongoPort, "--eval", 'db.getSiblingDB("admin").shutdownServer({force:true})'], { stdio: "ignore" });
};
process.once("SIGINT", () => { stop(); process.exit(130); });
process.once("SIGTERM", () => { stop(); process.exit(143); });
process.once("exit", stop);

run("mongod", [
  "--replSet", replicaSet, "--port", mongoPort, "--dbpath", dbPath,
  "--bind_ip", "127.0.0.1", "--nounixsocket", "--fork", "--logpath", join(dbPath, "mongod.log"),
]);
run("mongosh", ["--quiet", "--port", mongoPort, "--eval", `rs.initiate({_id:"${replicaSet}",members:[{_id:0,host:"127.0.0.1:${mongoPort}"}]})`]);
for (let attempt = 0; attempt < 20; attempt += 1) {
  const ready = spawnSync("mongosh", ["--quiet", "--port", mongoPort, "--eval", "db.hello().isWritablePrimary"], { encoding: "utf8" });
  if (ready.stdout?.trim() === "true") break;
  await new Promise((resolve) => setTimeout(resolve, 500));
}

const shared = {
  ...process.env,
  PATH: runtimePath,
  NODE_ENV: "test",
  E2E_ALLOW_DESTRUCTIVE_SEED: "true",
  E2E_MONGODB_URI: mongoUri,
  E2E_ADMIN_PASSWORD: "ElexifyAdminE2E!2026",
  MONGODB_URI: mongoUri,
  // Must match environment.e2e.ts's X_API_KEY exactly.
  API_KEY: "Ip2A4a02I1r1I9dE1iSnA0S6aB1tE5WS",
  ACCESS_TOKEN_SECRET: "elexify-admin-e2e-access-token-secret-with-32-bytes",
  SERVER_HOSTNAME: "127.0.0.1",
  SERVER_PORT: backendPort,
  FRONTEND_URL: `http://localhost:${adminPort}`,
};
run(nodeBinary, ["src/scripts/seedAdminE2E.js"], { cwd: backend, env: shared });

children.push(spawn(nodeBinary, ["src/server.js"], { cwd: backend, env: shared, stdio: "inherit" }));
await waitFor(`http://127.0.0.1:${backendPort}/api/v1/site/inventory/order/list`);
children.push(spawn("npx", ["ng", "serve", "--configuration", "e2e", "--port", adminPort], {
  cwd: adminPanel,
  env: shared,
  stdio: "inherit",
}));
await waitFor(`http://localhost:${adminPort}`);
console.log(`E2E_READY base=http://localhost:${adminPort} api=http://127.0.0.1:${backendPort}/api/v1/ mongo=${mongoUri}`);
await new Promise(() => {});
