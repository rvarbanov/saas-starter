/**
 * Idempotent backfill of `users.searchText` after deploying RAD-72.
 * Requires CONVEX_DEPLOY_KEY (or an interactive `npx convex` login).
 *
 * Usage: pnpm convex:backfill-search-text
 */
import { spawnSync } from "node:child_process";

function runBackfill(cursor) {
  const args = [
    "exec",
    "convex",
    "run",
    "users:backfillSearchText",
    JSON.stringify({
      paginationOpts: { numItems: 100, cursor },
    }),
  ];
  const result = spawnSync("pnpm", args, {
    encoding: "utf8",
    env: process.env,
  });
  if (result.status !== 0) {
    process.stderr.write(result.stderr || result.stdout || "convex run failed\n");
    process.exit(result.status ?? 1);
  }
  const stdout = (result.stdout || "").trim();
  // Convex CLI prints the JSON return value on the last non-empty line.
  const lines = stdout.split("\n").filter((line) => line.trim() !== "");
  const last = lines.at(-1) ?? "";
  try {
    return JSON.parse(last);
  } catch {
    process.stderr.write(`Could not parse convex run output:\n${stdout}\n`);
    process.exit(1);
  }
}

let cursor = null;
let totalPatched = 0;
for (let i = 0; i < 100; i += 1) {
  const page = runBackfill(cursor);
  totalPatched += page.patched ?? 0;
  if (page.isDone) {
    console.log(`backfillSearchText done; patched=${totalPatched}`);
    process.exit(0);
  }
  cursor = page.continueCursor;
}

console.error("backfillSearchText did not finish within 100 pages");
process.exit(1);
