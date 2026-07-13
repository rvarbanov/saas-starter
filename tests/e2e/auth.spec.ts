import { expect, test } from "@playwright/test";

test.describe("auth shell", () => {
  test("sign-in page explains email/password and offers continue control", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page.getByRole("heading", { name: /^Sign in$/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Continue to sign in/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /^Sign up$/i })).toHaveAttribute(
      "href",
      "/sign-up",
    );
    await expect(page.getByText(/email/i)).toBeVisible();
    await expect(page.getByText(/password/i)).toBeVisible();
  });

  test("sign-up page loads with sign in and continue controls", async ({ page }) => {
    await page.goto("/sign-up");
    await expect(page).toHaveURL(/\/sign-up\/?$/);
    await expect(page.getByRole("heading", { name: /^Sign up$/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Continue to sign up/i })).toHaveAttribute(
      "href",
      "/sign-up/start",
    );
    await expect(page.getByRole("link", { name: /^Sign in$/i })).toHaveAttribute(
      "href",
      "/sign-in",
    );
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

  test("unauthenticated user cannot stay on profile", async ({ page }) => {
    await page.goto("/profile");
    await expect(page).not.toHaveURL(/\/profile\/?$/);
  });
});

