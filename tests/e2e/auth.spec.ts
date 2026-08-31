import { expect, test, type Page } from "@playwright/test";

function globalNav(page: Page) {
  return page.getByRole("navigation", { name: "Global" });
}

test.describe("global nav", () => {
  test("home page shows nav links with correct destinations", async ({ page }) => {
    await page.goto("/");
    const nav = globalNav(page);
    await expect(nav).toBeVisible();
    await expect(nav.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
    await expect(nav.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/dashboard");
    await expect(nav.getByRole("link", { name: "Sign up" })).toHaveAttribute(
      "href",
      "/sign-up/start",
    );
  });

  test("sign-in page shows the same global nav links", async ({ page }) => {
    await page.goto("/sign-in");
    const nav = globalNav(page);
    await expect(nav).toBeVisible();
    await expect(nav.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
    await expect(nav.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/dashboard");
    await expect(nav.getByRole("link", { name: "Sign up" })).toHaveAttribute(
      "href",
      "/sign-up/start",
    );
  });
});

test.describe("auth shell", () => {
  test("sign-in page explains email/password and offers continue control", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page.getByRole("heading", { name: /^Sign in$/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Continue to sign in/i })).toBeVisible();
    await expect(page.getByRole("main").getByRole("link", { name: /^Sign up$/i })).toHaveAttribute(
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
    await expect(page.getByRole("main").getByRole("link", { name: /^Sign in$/i })).toHaveAttribute(
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

  test("unauthenticated user cannot stay on dashboard settings", async ({ page }) => {
    await page.goto("/dashboard/settings");
    await expect(page).not.toHaveURL(/\/dashboard\/settings\/?$/);
  });

  test("unauthenticated user cannot stay on dashboard profile", async ({ page }) => {
    await page.goto("/dashboard/profile");
    await expect(page).not.toHaveURL(/\/dashboard\/profile\/?$/);
  });

  test("unauthenticated user cannot stay on dashboard users", async ({ page }) => {
    await page.goto("/dashboard/users");
    await expect(page).not.toHaveURL(/\/dashboard\/users\/?$/);
  });

  test("unauthenticated user cannot stay on dashboard coming soon", async ({ page }) => {
    await page.goto("/dashboard/coming-soon");
    await expect(page).not.toHaveURL(/\/dashboard\/coming-soon\/?$/);
  });
});
