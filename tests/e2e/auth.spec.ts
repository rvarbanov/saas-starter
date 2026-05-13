import { expect, test } from "@playwright/test";

test.describe("auth shell", () => {
  test("sign-in page explains email/password and offers continue control", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page.getByRole("heading", { name: /^Sign in$/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Continue to sign in/i })).toBeVisible();
    await expect(page.getByText(/email/i)).toBeVisible();
    await expect(page.getByText(/password/i)).toBeVisible();
  });

  test("unauthenticated user cannot stay on dashboard", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).not.toHaveURL(/\/dashboard\/?$/);
  });

  test("unauthenticated user cannot stay on settings", async ({ page }) => {
    await page.goto("/settings");
    await expect(page).not.toHaveURL(/\/settings\/?$/);
  });
});

test.describe("full WorkOS login", () => {
  test.skip(
    !process.env.E2E_WORKOS_EMAIL || !process.env.E2E_WORKOS_PASSWORD,
    "Set E2E_WORKOS_EMAIL and E2E_WORKOS_PASSWORD to run full login E2E.",
  );

  test("user signs in and reaches dashboard", async ({ page }) => {
    const email = process.env.E2E_WORKOS_EMAIL as string;
    const password = process.env.E2E_WORKOS_PASSWORD as string;

    await page.goto("/sign-in");
    await page.getByRole("link", { name: /Continue to sign in/i }).click();

    await page.getByLabel(/email/i).fill(email);
    await page.getByRole("button", { name: /continue/i }).click();

    const passwordField = page.getByLabel(/password/i);
    await expect(passwordField).toBeVisible({ timeout: 15_000 });
    await passwordField.fill(password);
    await page.getByRole("button", { name: /sign in|log in/i }).click();

    await page.waitForURL(/\/dashboard/, { timeout: 60_000 });
    await expect(page.getByRole("heading", { name: /Signed in/i })).toBeVisible();
  });
});
