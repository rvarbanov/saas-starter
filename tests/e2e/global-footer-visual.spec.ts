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

test.describe("global footer visuals", () => {
  test.beforeAll(() => {
    mkdirSync(SCREENSHOT_DIR, { recursive: true });
  });

  test("homepage shows global footer", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /AI-ready SaaS template/i })).toBeVisible();
    await expect(page.getByText(/Copyright © \d{4}/)).toBeVisible();
    const createdBy = page.getByRole("link", { name: /Created by rvarbanov/i });
    await expect(createdBy).toBeVisible();
    await expect(createdBy).toHaveAttribute(
      "href",
      "https://github.com/rvarbanov/saas-starter",
    );
    await page.screenshot({
      path: resolve(SCREENSHOT_DIR, "homepage-global-footer.png"),
      fullPage: true,
    });
  });
});
