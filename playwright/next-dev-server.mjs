#!/usr/bin/env node
/**
 * Wraps `next dev` for Playwright webServer and drops benign ECONNRESET / aborted
 * noise when clients disconnect mid-request during fast E2E navigation.
 */
import { spawn } from "node:child_process";

const nextArgs = process.argv.slice(2);

const child = spawn("pnpm", ["exec", "next", "dev", ...nextArgs], {
  stdio: ["inherit", "pipe", "pipe"],
  env: process.env,
  shell: true,
});

/** @param {(text: string) => void} write */
function createBenignAbortFilter(write) {
  let pending = "";
  let suppressing = false;
  let sawEconnreset = false;

  const isAbortStart = (line) => /Error: aborted/.test(line);

  const onLine = (line) => {
    if (!suppressing) {
      if (isAbortStart(line)) {
        suppressing = true;
        sawEconnreset = false;
        if (/ECONNRESET/.test(line)) {
          sawEconnreset = true;
        }
        if (sawEconnreset && /^\s*\}\s*$/.test(line)) {
          suppressing = false;
        }
        return;
      }
      write(`${line}\n`);
      return;
    }

    if (/ECONNRESET/.test(line)) {
      sawEconnreset = true;
    }
    if (sawEconnreset && /^\s*\}\s*$/.test(line)) {
      suppressing = false;
      sawEconnreset = false;
    }
  };

  return {
    onData(chunk) {
      pending += chunk.toString();
      const lines = pending.split("\n");
      pending = lines.pop() ?? "";
      for (const line of lines) {
        onLine(line);
      }
    },
    flush() {
      if (pending) {
        onLine(pending);
        pending = "";
      }
    },
  };
}

const stdoutFilter = createBenignAbortFilter((text) => process.stdout.write(text));
const stderrFilter = createBenignAbortFilter((text) => process.stderr.write(text));

child.stdout.on("data", (chunk) => stdoutFilter.onData(chunk));
child.stderr.on("data", (chunk) => stderrFilter.onData(chunk));

child.stdout.on("end", () => stdoutFilter.flush());
child.stderr.on("end", () => stderrFilter.flush());

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    child.kill(signal);
  });
}

child.on("exit", (code, signal) => {
  stdoutFilter.flush();
  stderrFilter.flush();
  if (signal) {
    process.exit(1);
  }
  process.exit(code ?? 0);
});
