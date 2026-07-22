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

test.describe("home visuals", () => {
  test.beforeAll(() => {
    mkdirSync(SCREENSHOT_DIR, { recursive: true });
  });

  test("home page shows global nav and footer", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /AI-ready SaaS template/i })).toBeVisible();

    const nav = page.getByRole("navigation", { name: "Global" });
    await expect(nav).toBeVisible();
    await expect(nav.getByRole("link", { name: "Home" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Sign in" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Sign up" })).toBeVisible();

    await expect(page.getByText(/Copyright © \d{4}/)).toBeVisible();
    const createdBy = page.getByRole("link", { name: /Created by rvarbanov/i });
    await expect(createdBy).toBeVisible();
    await expect(createdBy).toHaveAttribute(
      "href",
      "https://github.com/rvarbanov/saas-starter",
    );

    await page.screenshot({
      path: resolve(SCREENSHOT_DIR, "home.png"),
      fullPage: true,
    });
  });
});
