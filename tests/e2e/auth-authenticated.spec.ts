import { expect, test } from "@playwright/test";

test.describe("authenticated session", () => {
  test.describe.configure({ mode: "serial" });

  test("dashboard shows signed-in user", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: /Signed in/i })).toBeVisible();
  });

  test("session persists across dashboard, settings, and home", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: /Signed in/i })).toBeVisible();

    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: /^Account$/i })).toBeVisible();

    await page.goto("/");
    await expect(page.getByRole("link", { name: /^Dashboard$/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /^Sign in$/i })).not.toBeVisible();
  });

  test("sign out ends session and returns home", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: /Signed in/i })).toBeVisible();

    await Promise.all([
      page.waitForURL((url) => url.pathname === "/", {
        timeout: 60_000,
        waitUntil: "commit",
      }),
      page.getByRole("button", { name: /^Sign out$/i }).click(),
    ]);
    await expect(page.getByRole("link", { name: /^Sign in$/i })).toBeVisible();

    await page.goto("/dashboard");
    await expect(page).not.toHaveURL(/\/dashboard\/?$/);
  });
});
