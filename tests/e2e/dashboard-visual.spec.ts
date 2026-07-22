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

test.describe("dashboard visuals", () => {
  test.beforeAll(() => {
    mkdirSync(SCREENSHOT_DIR, { recursive: true });
  });

  test("dashboard shows global nav and footer when signed in", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: /Signed in/i })).toBeVisible();

    const nav = page.getByRole("navigation", { name: "Global" });
    await expect(nav).toBeVisible();
    await expect(nav.getByRole("link", { name: "Home" })).toBeVisible();

    await expect(page.getByText(/Copyright © \d{4}/)).toBeVisible();
    await expect(page.getByRole("link", { name: /Created by rvarbanov/i })).toBeVisible();

    await page.screenshot({
      path: resolve(SCREENSHOT_DIR, "dashboard.png"),
      fullPage: true,
    });
  });
});
