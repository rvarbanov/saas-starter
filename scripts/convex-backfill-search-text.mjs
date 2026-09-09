/**
 * Idempotent backfill of `users.searchText` after deploying RAD-72.
 * Requires CONVEX_DEPLOY_KEY (or an interactive `npx convex` login).
 *
 * Usage: pnpm convex:backfill-search-text
 */
import { spawnSync } from "node:child_process";

function parseConvexJson(stdout) {
  const text = (stdout || "").trim();
  // Convex CLI may pretty-print the return value across multiple lines.
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error(`No JSON object in convex run output:\n${text}`);
  }
  return JSON.parse(text.slice(start, end + 1));
}

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
  try {
    return parseConvexJson(result.stdout || "");
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
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
