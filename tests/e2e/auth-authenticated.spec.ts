import { expect, test } from "@playwright/test";
import { AUTH_STORAGE_PATH, getCanonicalPlaywrightOrigin } from "../../playwright/env";

test.describe("authenticated session", () => {
  test.describe.configure({ mode: "serial" });

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.title !== "session persists across dashboard, settings, and home") {
      return;
    }
    await page.goto("about:blank");
  });

  test("dashboard shows signed-in user", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: /Signed in/i })).toBeVisible();
  });

  test("session persists across dashboard, settings, and home", async ({ page }) => {
    await page.goto("/dashboard", { waitUntil: "load" });
    await expect(page.getByRole("heading", { name: /Signed in/i })).toBeVisible();

    await page.goto("/settings", { waitUntil: "load" });
    await expect(page.getByRole("heading", { name: /^Account$/i })).toBeVisible();

    await page.goto("/", { waitUntil: "load" });
    await expect(page.getByTestId("convex-status")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("link", { name: /^Dashboard$/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /^Sign in$/i })).not.toBeVisible();
  });

  test("sign out ends session and returns home", async ({ browser, baseURL }) => {
    const appOrigin = baseURL ?? getCanonicalPlaywrightOrigin();
    const context = await browser.newContext({ storageState: AUTH_STORAGE_PATH });
    const page = await context.newPage();

    try {
      await page.goto("/dashboard", { waitUntil: "load" });
      await expect(page.getByRole("heading", { name: /Signed in/i })).toBeVisible();

      await Promise.all([
        page.waitForURL((url) => url.origin === appOrigin && url.pathname === "/", {
          timeout: 60_000,
          waitUntil: "load",
        }),
        page.getByRole("button", { name: /^Sign out$/i }).click(),
      ]);
      await expect(page.getByRole("link", { name: /^Sign in$/i })).toBeVisible();

      await page.goto("/dashboard");
      await expect(page).not.toHaveURL(/\/dashboard\/?$/);
    } finally {
      await context.close();
    }
  });
});
