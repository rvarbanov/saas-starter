#!/usr/bin/env node
/**
 * Starts the Next.js standalone server for Playwright E2E (after `next build`).
 * Mirrors Docker: copies `public` + `.next/static` into `.next/standalone`, then runs `server.js`.
 */
import { spawn } from "node:child_process";
import { cpSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function parseArgs(argv) {
  let port = 3000;
  let hostname = "127.0.0.1";
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--port" && argv[i + 1]) {
      port = Number.parseInt(argv[++i], 10);
    } else if (argv[i] === "--hostname" && argv[i + 1]) {
      hostname = argv[++i];
    }
  }
  return { port, hostname };
}

const cwd = process.cwd();
const standaloneDir = resolve(cwd, ".next/standalone");
const serverEntry = resolve(standaloneDir, "server.js");

if (!existsSync(serverEntry)) {
  console.error("Missing .next/standalone/server.js — run `pnpm build` before `make e2e-prod`.");
  process.exit(1);
}

cpSync(resolve(cwd, "public"), resolve(standaloneDir, "public"), { recursive: true });
cpSync(resolve(cwd, ".next/static"), resolve(standaloneDir, ".next/static"), { recursive: true });

const { port, hostname } = parseArgs(process.argv.slice(2));

const child = spawn("node", ["server.js"], {
  cwd: standaloneDir,
  env: {
    ...process.env,
    NODE_ENV: "production",
    PORT: String(port),
    HOSTNAME: hostname,
  },
  stdio: "inherit",
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    child.kill(signal);
  });
}

child.on("exit", (code, signal) => {
  if (signal) {
    process.exit(1);
  }
  process.exit(code ?? 0);
});
