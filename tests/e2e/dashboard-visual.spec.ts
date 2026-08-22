import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

const SCREENSHOT_DIR = resolve(
  process.env.PLAYWRIGHT_SCREENSHOT_DIR ?? "test-results/screenshots",
);

test.describe("dashboard visuals", () => {
  test.beforeAll(() => {
    mkdirSync(SCREENSHOT_DIR, { recursive: true });
  });

  test("dashboard is free of marketing chrome when signed in", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: /Signed in/i })).toBeVisible();

    await expect(page.getByRole("navigation", { name: "Global" })).toHaveCount(0);
    await expect(page.getByText(/Copyright © \d{4}/)).toHaveCount(0);
    await expect(page.getByRole("link", { name: /Created by rvarbanov/i })).toHaveCount(0);

    await page.screenshot({
      path: resolve(SCREENSHOT_DIR, "dashboard.png"),
      fullPage: true,
    });
  });
});
