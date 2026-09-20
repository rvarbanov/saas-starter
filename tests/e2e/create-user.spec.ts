import { expect, type Page, test } from "@playwright/test";
import { APP_ROUTES, createUserPath } from "../../lib/app-routes";

function expectPath(page: Page, pathname: string) {
  return expect(page).toHaveURL((url) => {
    const current = url.pathname.replace(/\/$/, "") || "/";
    const expected = pathname.replace(/\/$/, "") || "/";
    return current === expected;
  });
}

async function openCreateUser(page: Page) {
  await page.goto(APP_ROUTES.users, { waitUntil: "load" });
  await page.getByTestId("create-user-entry").click();
  await expectPath(page, createUserPath());
  await expect(page.getByTestId("create-user-page")).toBeVisible();
}

test.describe("Create User P–S", () => {
  test("P: Users → Create user → email-only submit → User detail", async ({ page }) => {
    await openCreateUser(page);
    const email = `e2e-create+${Date.now()}@example.com`;
    await page.getByTestId("create-user-email").fill(email);
    await page.getByTestId("create-user-submit").click();
    await expect(page.getByTestId("user-detail-page")).toBeVisible();
    await expect(page.getByTestId("user-detail-page")).toHaveText(new RegExp(email, "i"));
  });

  test("Q: invalid email stays on Create with Invalid email address", async ({ page }) => {
    await openCreateUser(page);
    await page.getByTestId("create-user-email").fill("not-an-email");
    await page.getByTestId("create-user-submit").click();
    await expect(page.getByTestId("create-user-error")).toHaveText("Invalid email address");
    await expectPath(page, createUserPath());
  });

  test("R: duplicate E2E email stays on Create", async ({ page }) => {
    const email = process.env.E2E_WORKOS_EMAIL?.trim();
    if (!email) {
      test.skip(true, "E2E_WORKOS_EMAIL required");
      return;
    }
    await openCreateUser(page);
    await page.getByTestId("create-user-email").fill(email);
    await page.getByTestId("create-user-submit").click();
    await expect(page.getByTestId("create-user-error")).toBeVisible();
    await expectPath(page, createUserPath());
  });

  test("S: Cancel returns to the Users list", async ({ page }) => {
    await openCreateUser(page);
    await page.getByTestId("create-user-cancel").click();
    await expectPath(page, APP_ROUTES.users);
    await expect(page.getByRole("heading", { name: /^Users$/i })).toBeVisible();
  });
});
