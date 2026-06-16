import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig, devices } from "@playwright/test";
import { config as loadEnv } from "dotenv";

const cwd = process.cwd();
const envPath = resolve(cwd, ".env");
const secretPath = resolve(cwd, ".secret");
if (existsSync(envPath)) {
  loadEnv({ path: envPath, quiet: true });
}
if (existsSync(secretPath)) {
  loadEnv({ path: secretPath, quiet: true, override: true });
}

const DEFAULT_ORIGIN = "http://localhost:3000";

/** Positive integer from env, or fallback when missing / invalid / non-positive. */
function envPositiveInt(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (raw === undefined || raw === "") return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/**
 * Canonical Playwright origin.
 * Fallback: PLAYWRIGHT_BASE_URL → NEXT_PUBLIC_APP_URL → http://localhost:3000
 */
function getCanonicalPlaywrightOrigin(): string {
  const playwrightBase = process.env.PLAYWRIGHT_BASE_URL?.trim();
  if (playwrightBase) {
    try {
      return new URL(playwrightBase).origin;
    } catch {
      /* fall through */
    }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (appUrl) {
    try {
      return new URL(appUrl).origin;
    } catch {
      /* fall through */
    }
  }

  return DEFAULT_ORIGIN;
}

function isLocalDevHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h === "localhost" || h === "127.0.0.1" || h === "::1";
}

const playwrightOrigin = getCanonicalPlaywrightOrigin();
const playwrightOriginUrl = (() => {
  try {
    return new URL(playwrightOrigin);
  } catch {
    return new URL(DEFAULT_ORIGIN);
  }
})();

const runLocalWebServer = isLocalDevHost(playwrightOriginUrl.hostname);

const testTimeoutMs = envPositiveInt("PLAYWRIGHT_TEST_TIMEOUT_MS", 60_000);
const expectTimeoutMs = envPositiveInt("PLAYWRIGHT_EXPECT_TIMEOUT_MS", 10_000);
const navigationTimeoutMs = envPositiveInt("PLAYWRIGHT_NAVIGATION_TIMEOUT_MS", 30_000);
const actionTimeoutMs = envPositiveInt("PLAYWRIGHT_ACTION_TIMEOUT_MS", 15_000);
const webServerTimeoutMs = envPositiveInt("PLAYWRIGHT_WEBSERVER_TIMEOUT_MS", 120_000);

// TODO(staging): Point PLAYWRIGHT_BASE_URL at a preview/staging deployment and rely on CI/env
// to skip local webServer (non-loopback hosts disable `webServer` below); align NEXT_PUBLIC_APP_URL
// and OAuth redirect URIs with that same origin.

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  timeout: testTimeoutMs,
  expect: {
    timeout: expectTimeoutMs,
  },
  use: {
    baseURL: playwrightOrigin,
    trace: "retain-on-failure",
    navigationTimeout: navigationTimeoutMs,
    actionTimeout: actionTimeoutMs,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  ...(runLocalWebServer
    ? {
        webServer: {
          command: "node scripts/dev-e2e.mjs",
          url: `${playwrightOrigin}/api/health`,
          reuseExistingServer: !process.env.CI,
          timeout: webServerTimeoutMs,
        },
      }
    : {}),
});
