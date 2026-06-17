import { defineConfig, devices } from "@playwright/test";
import {
  AUTH_STORAGE_PATH,
  envPositiveInt,
  getCanonicalPlaywrightOrigin,
  getPlaywrightOriginUrl,
  hasWorkOsE2eCreds,
  isLocalDevHost,
  loadPlaywrightEnv,
  parseOriginForDevServer,
} from "./playwright/env";

loadPlaywrightEnv();

const playwrightOrigin = getCanonicalPlaywrightOrigin();
const playwrightOriginUrl = getPlaywrightOriginUrl();
const runLocalWebServer = isLocalDevHost(playwrightOriginUrl.hostname);
const { port, bindHost } = parseOriginForDevServer();

const testTimeoutMs = envPositiveInt("PLAYWRIGHT_TEST_TIMEOUT_MS", 60_000);
const expectTimeoutMs = envPositiveInt("PLAYWRIGHT_EXPECT_TIMEOUT_MS", 10_000);
const navigationTimeoutMs = envPositiveInt("PLAYWRIGHT_NAVIGATION_TIMEOUT_MS", 30_000);
const actionTimeoutMs = envPositiveInt("PLAYWRIGHT_ACTION_TIMEOUT_MS", 15_000);
const webServerTimeoutMs = envPositiveInt("PLAYWRIGHT_WEBSERVER_TIMEOUT_MS", 120_000);

const useProductionWebServer = process.env.PLAYWRIGHT_WEB_SERVER === "production";
const webServerCommand = useProductionWebServer
  ? `node playwright/next-prod-server.mjs --port ${port} --hostname ${bindHost}`
  : `node playwright/next-dev-server.mjs --port ${port} --hostname ${bindHost}`;

const playwrightWorkers = process.env.PLAYWRIGHT_WORKERS?.trim()
  ? envPositiveInt("PLAYWRIGHT_WORKERS", 1)
  : process.env.CI
    ? 2
    : undefined;

const chromiumProject = {
  name: "chromium",
  testIgnore: [/auth\.setup\.ts/, /auth-authenticated\.spec\.ts/, /auth-sign-out\.spec\.ts/],
  use: { ...devices["Desktop Chrome"] },
};

const projects = hasWorkOsE2eCreds()
  ? [
      { name: "setup", testMatch: /auth\.setup\.ts/ },
      chromiumProject,
      {
        name: "authenticated",
        testMatch: /auth-authenticated\.spec\.ts/,
        use: {
          ...devices["Desktop Chrome"],
          storageState: AUTH_STORAGE_PATH,
        },
        dependencies: ["setup"],
      },
      {
        name: "authenticated-sign-out",
        testMatch: /auth-sign-out\.spec\.ts/,
        use: {
          ...devices["Desktop Chrome"],
          storageState: AUTH_STORAGE_PATH,
        },
        dependencies: ["authenticated"],
      },
    ]
  : [chromiumProject];

// Authenticated sign-out E2E requires WorkOS Sign-out redirects = NEXT_PUBLIC_APP_URL.
// TODO(staging): Point PLAYWRIGHT_BASE_URL at a preview/staging deployment and rely on CI/env
// to skip local webServer (non-loopback hosts disable `webServer` below); align NEXT_PUBLIC_APP_URL
// and OAuth redirect URIs with that same origin.

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./playwright/global-setup.ts",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: playwrightWorkers,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  timeout: testTimeoutMs,
  expect: {
    timeout: expectTimeoutMs,
  },
  use: {
    baseURL: playwrightOrigin,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    navigationTimeout: navigationTimeoutMs,
    actionTimeout: actionTimeoutMs,
  },
  projects,
  ...(runLocalWebServer
    ? {
        webServer: {
          command: webServerCommand,
          url: `${playwrightOrigin}/api/health`,
          reuseExistingServer: false,
          timeout: webServerTimeoutMs,
          gracefulShutdown: { signal: "SIGTERM", timeout: 500 },
        },
      }
    : {}),
});
