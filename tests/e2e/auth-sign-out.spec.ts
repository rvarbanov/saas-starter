import { expect, test } from "@playwright/test";
import { AUTH_STORAGE_PATH, getCanonicalPlaywrightOrigin } from "../../playwright/env";

test("sign out ends session and returns home", async ({ browser, baseURL }) => {
  const appOrigin = baseURL ?? getCanonicalPlaywrightOrigin();
  const context = await browser.newContext({ storageState: AUTH_STORAGE_PATH });
  const page = await context.newPage();

  try {
    await page.goto("/dashboard", { waitUntil: "load" });
    await expect(page.getByRole("heading", { name: /Signed in/i })).toBeVisible();

    await page.getByRole("button", { name: /^Account$/i }).click();
    await Promise.all([
      page.waitForURL((url) => url.origin === appOrigin && url.pathname === "/", {
        timeout: 60_000,
        waitUntil: "load",
      }),
      page.getByRole("menuitem", { name: /^Sign out$/i }).click(),
    ]);
    const nav = page.getByRole("navigation", { name: "Global" });
    await expect(nav.getByRole("link", { name: /^Sign in$/i })).toBeVisible();
    await expect(nav.getByRole("link", { name: /^Sign up$/i })).toBeVisible();
    await expect(nav.getByRole("link", { name: /^Dashboard$/i })).not.toBeVisible();

    await page.goto("/dashboard");
    await expect(page).not.toHaveURL(/\/dashboard\/?$/);
  } finally {
    await context.close();
  }
});
