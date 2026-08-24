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

    await expect(page.getByTestId("app-sidebar")).toBeVisible();
    await expect(page.getByTestId("app-topbar")).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Global" })).toHaveCount(0);
    await expect(page.locator("footer.site-footer")).toHaveCount(0);
    await expect(page.getByTestId("app-footer")).toBeVisible();
    await expect(page.getByTestId("app-footer").getByText(/Copyright © \d{4}/)).toBeVisible();
    await expect(
      page.getByTestId("app-footer").getByRole("link", { name: /Created by rvarbanov/i }),
    ).toBeVisible();

    await page.screenshot({
      path: resolve(SCREENSHOT_DIR, "dashboard.png"),
      fullPage: true,
    });
  });
});
