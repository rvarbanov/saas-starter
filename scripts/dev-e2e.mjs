import net from "node:net";
import { spawn } from "node:child_process";
import {
  devBindHost,
  getPlaywrightOriginUrl,
  healthCheckUrl,
  loadPlaywrightEnv,
} from "./playwright-env.mjs";

loadPlaywrightEnv();

const originUrl = getPlaywrightOriginUrl();
const port =
  originUrl.port !== "" ? Number.parseInt(originUrl.port, 10) : originUrl.protocol === "https:" ? 443 : 80;
const bindHost = devBindHost(originUrl.hostname);
const healthUrl = healthCheckUrl(originUrl.origin);

async function fetchHealth(timeoutMs = 2000) {
  try {
    const response = await fetch(healthUrl, {
      signal: AbortSignal.timeout(timeoutMs),
    });
    return response.ok;
  } catch {
    return false;
  }
}

function isPortOpen(host, targetPort) {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port: targetPort, timeout: 1000 }, () => {
      socket.destroy();
      resolve(true);
    });
    socket.on("error", () => resolve(false));
    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });
  });
}

const healthy = await fetchHealth();
if (healthy) {
  process.exit(0);
}

const portOpen = await isPortOpen(bindHost, port);
if (portOpen) {
  console.error(
    `E2E: ${originUrl.origin} is reachable on port ${port} but GET ${healthUrl} failed.`,
  );
  console.error(
    `Stop the stale process (e.g. lsof -ti:${port} | xargs kill) or fix the dev server, then retry.`,
  );
  process.exit(1);
}

const child = spawn(
  "pnpm",
  ["exec", "next", "dev", "--port", String(port), "--hostname", bindHost],
  { stdio: "inherit", env: process.env },
);

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});

process.on("SIGINT", () => child.kill("SIGINT"));
process.on("SIGTERM", () => child.kill("SIGTERM"));
