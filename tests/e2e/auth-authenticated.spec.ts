import { expect, test } from "@playwright/test";

test("dashboard shows signed-in user and Convex profile", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: /Signed in/i })).toBeVisible();
  await expect(page.getByTestId("convex-user-profile")).toBeVisible({ timeout: 15_000 });
});

test("session persists across all App paths and home", async ({ page }) => {
  // J (RAD-83): five App routes + home; URL + one landmark per hop (page.goto; F covers click tour).
  await page.goto("/dashboard", { waitUntil: "load" });
  await expect(page).toHaveURL(/\/dashboard\/?$/);
  await expect(page.getByTestId("convex-user-profile")).toBeVisible({ timeout: 15_000 });

  await page.goto("/dashboard/settings", { waitUntil: "load" });
  await expect(page).toHaveURL(/\/dashboard\/settings\/?$/);
  await expect(page.getByRole("heading", { name: /^Account$/i })).toBeVisible();

  await page.goto("/dashboard/profile", { waitUntil: "load" });
  await expect(page).toHaveURL(/\/dashboard\/profile\/?$/);
  await expect(page.getByRole("heading", { name: /^Your name$/i })).toBeVisible();

  await page.goto("/dashboard/users", { waitUntil: "load" });
  await expect(page).toHaveURL(/\/dashboard\/users\/?$/);
  await expect(page.getByRole("heading", { name: /^Users$/i })).toBeVisible();

  await page.goto("/dashboard/coming-soon", { waitUntil: "load" });
  await expect(page).toHaveURL(/\/dashboard\/coming-soon\/?$/);
  await expect(page.getByRole("heading", { name: /^Coming soon$/i })).toBeVisible();

  await page.goto("/", { waitUntil: "load" });
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByTestId("convex-status")).toBeVisible({ timeout: 15_000 });
  // Home CTA is auth-aware; GlobalNav still uses a static "Sign in" label → /dashboard.
  const main = page.getByRole("main");
  await expect(main.getByRole("link", { name: /^Dashboard$/i })).toBeVisible({ timeout: 15_000 });
  await expect(main.getByRole("link", { name: /^Sign in$/i })).not.toBeVisible();
});

test("authenticated user visiting sign-up is redirected to dashboard", async ({ page }) => {
  await page.goto("/sign-up", { waitUntil: "load" });
  await expect(page).toHaveURL(/\/dashboard\/?$/);
  await expect(page.getByRole("heading", { name: /Signed in/i })).toBeVisible();
});
