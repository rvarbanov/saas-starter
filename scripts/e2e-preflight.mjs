import net from "node:net";
import {
  devBindHost,
  getCanonicalPlaywrightOrigin,
  getPlaywrightOriginUrl,
  healthCheckUrl,
  loadPlaywrightEnv,
} from "./playwright-env.mjs";

loadPlaywrightEnv();

const origin = getCanonicalPlaywrightOrigin();
const originUrl = getPlaywrightOriginUrl();
const port =
  originUrl.port !== "" ? Number.parseInt(originUrl.port, 10) : originUrl.protocol === "https:" ? 443 : 80;
const bindHost = devBindHost(originUrl.hostname);
const healthUrl = healthCheckUrl(origin);

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
  console.log(`E2E: reusing dev server at ${origin}`);
  process.exit(0);
}

const portOpen = await isPortOpen(bindHost, port);
if (portOpen) {
  console.warn(
    `E2E: port ${port} is in use but ${healthUrl} is not healthy — check for a stale process (lsof -ti:${port}).`,
  );
  process.exit(1);
}

console.log(`E2E: no healthy server at ${origin}; Playwright will start one.`);
