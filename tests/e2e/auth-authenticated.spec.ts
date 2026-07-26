import { expect, test } from "@playwright/test";

test("dashboard shows signed-in user and Convex profile", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: /Signed in/i })).toBeVisible();
  await expect(page.getByTestId("convex-user-profile")).toBeVisible({ timeout: 15_000 });
});

test("session persists across dashboard, settings, and home", async ({ page }) => {
  await page.goto("/dashboard", { waitUntil: "load" });
  await expect(page.getByRole("heading", { name: /Signed in/i })).toBeVisible();
  await expect(page.getByTestId("convex-user-profile")).toBeVisible({ timeout: 15_000 });

  await page.goto("/settings", { waitUntil: "load" });
  await expect(page.getByRole("heading", { name: /^Account$/i })).toBeVisible();
  await expect(page.getByTestId("convex-user-profile")).toBeVisible({ timeout: 15_000 });

  await page.goto("/", { waitUntil: "load" });
  await expect(page.getByTestId("convex-status")).toBeVisible({ timeout: 15_000 });
  const main = page.getByRole("main");
  await expect(main.getByRole("link", { name: /^Dashboard$/i })).toBeVisible({ timeout: 15_000 });
  await expect(main.getByRole("link", { name: /^Sign in$/i })).not.toBeVisible();
});

test("authenticated user visiting sign-up is redirected to dashboard", async ({ page }) => {
  await page.goto("/sign-up", { waitUntil: "load" });
  await expect(page).toHaveURL(/\/dashboard\/?$/);
  await expect(page.getByRole("heading", { name: /Signed in/i })).toBeVisible();
});
