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
  await expect(page.getByRole("link", { name: /^Dashboard$/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /^Sign in$/i })).not.toBeVisible();
});
