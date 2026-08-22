import { expect, test, type Page } from "@playwright/test";
import { APP_ROUTES } from "../../lib/app-routes";

function main(page: Page) {
  return page.getByRole("main");
}

function expectPath(page: Page, pathname: string) {
  return expect(page).toHaveURL((url) => {
    const current = url.pathname.replace(/\/$/, "") || "/";
    const expected = pathname.replace(/\/$/, "") || "/";
    return current === expected;
  });
}

test("walks nested dashboard routes via in-page links", async ({ page }) => {
  await page.goto(APP_ROUTES.dashboard, { waitUntil: "load" });
  await expectPath(page, APP_ROUTES.dashboard);
  await expect(page.getByRole("heading", { name: /Signed in/i })).toBeVisible();
  await expect(page.getByTestId("convex-user-profile")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("navigation", { name: "Global" })).toHaveCount(0);

  await main(page).getByRole("link", { name: /^Settings$/i }).click();
  await expectPath(page, APP_ROUTES.settings);
  await expect(page.getByRole("heading", { name: /^Account$/i })).toBeVisible();
  await expect(page.getByTestId("convex-user-profile")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("navigation", { name: "Global" })).toHaveCount(0);

  await main(page).getByRole("link", { name: /^Profile$/i }).click();
  await expectPath(page, APP_ROUTES.profile);
  await expect(page.getByRole("heading", { name: /^Your name$/i })).toBeVisible();
  await expect(
    page.getByTestId("profile-name-form").or(page.getByTestId("profile-loading")),
  ).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("navigation", { name: "Global" })).toHaveCount(0);

  await main(page).getByRole("link", { name: /^Back to settings$/i }).click();
  await expectPath(page, APP_ROUTES.settings);
  await expect(page.getByRole("heading", { name: /^Account$/i })).toBeVisible();

  await main(page).getByRole("link", { name: /^Back to dashboard$/i }).click();
  await expectPath(page, APP_ROUTES.dashboard);
  await expect(page.getByRole("heading", { name: /Signed in/i })).toBeVisible();
});
