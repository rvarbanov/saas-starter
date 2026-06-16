import { expect, test } from "@playwright/test";

test.describe("authenticated session", () => {
  test("dashboard shows signed-in user", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: /Signed in/i })).toBeVisible();
  });

  test("sign out ends session", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: /Signed in/i })).toBeVisible();

    await page.goto("/sign-out");
    await page.waitForURL(/\//, { timeout: 30_000 });

    await page.goto("/dashboard");
    await expect(page).not.toHaveURL(/\/dashboard\/?$/);
  });
});
