import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

const SCREENSHOT_DIR = resolve(
  process.env.PLAYWRIGHT_SCREENSHOT_DIR ?? "/opt/cursor/artifacts/screenshots",
);

test.use({
  channel: "chrome",
  contextOptions: {
    recordVideo: {
      dir: SCREENSHOT_DIR,
      size: { width: 1280, height: 900 },
    },
  },
});

test.describe("global nav visuals", () => {
  test.beforeAll(() => {
    mkdirSync(SCREENSHOT_DIR, { recursive: true });
  });

  test("homepage shows global nav", async ({ page }) => {
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Global" });
    await expect(nav).toBeVisible();
    await expect(nav.getByRole("link", { name: "Home" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Sign in" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Sign up" })).toBeVisible();
    await page.screenshot({
      path: resolve(SCREENSHOT_DIR, "homepage-global-nav.png"),
      fullPage: true,
    });
  });

  test("sign-in page shows global nav", async ({ page }) => {
    await page.goto("/sign-in");
    const nav = page.getByRole("navigation", { name: "Global" });
    await expect(nav).toBeVisible();
    await page.screenshot({
      path: resolve(SCREENSHOT_DIR, "sign-in-global-nav.png"),
      fullPage: true,
    });
  });

  test("dashboard redirects unauthenticated users to WorkOS", async ({ page }) => {
    await page.goto("/dashboard");
    await page.screenshot({
      path: resolve(SCREENSHOT_DIR, "dashboard-unauthenticated-redirect.png"),
      fullPage: true,
    });
  });
});
