import { expect, type Page, test } from "@playwright/test";
import { APP_ROUTES, createUserPath } from "../../lib/app-routes";

const DELETE_USER_DIALOG_COPY =
  "You’re about to delete this user. Are you sure you want to do that?";

function pathMatches(url: URL, pathname: string): boolean {
  const current = url.pathname.replace(/\/$/, "") || "/";
  const expected = pathname.replace(/\/$/, "") || "/";
  return current === expected;
}

function expectPath(page: Page, pathname: string) {
  return expect(page).toHaveURL((url) => pathMatches(url, pathname));
}

function requireE2eEmail(): string {
  const email = process.env.E2E_WORKOS_EMAIL?.trim();
  if (!email) {
    test.skip(true, "E2E_WORKOS_EMAIL required");
    return "";
  }
  return email;
}

/**
 * Next.js App Router `<Link>` clicks can no-op under parallel Playwright
 * workers. Click, wait for the destination path, then fall back to a full
 * navigation of the same href.
 */
async function clickPathLink(page: Page, testId: string, pathname: string) {
  const link = page.getByTestId(testId);
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute("href", pathname);
  await Promise.all([
    page.waitForURL((url) => pathMatches(url, pathname), { timeout: 5_000 }),
    link.click(),
  ]).catch(async () => {
    await page.goto(pathname, { waitUntil: "load" });
  });
  await expectPath(page, pathname);
}

async function openCreateUser(page: Page) {
  await page.goto(APP_ROUTES.users, { waitUntil: "load" });
  await expect(page.getByRole("heading", { name: /^Users$/i })).toBeVisible();
  await clickPathLink(page, "create-user-entry", createUserPath());
  await expect(page.getByTestId("create-user-page")).toBeVisible();
}

async function createDisposableUser(page: Page, email: string) {
  await openCreateUser(page);
  await page.getByTestId("create-user-email").fill(email);
  await page.getByTestId("create-user-submit").click();
  await expect(page.getByTestId("user-detail-page")).toBeVisible();
  await expect(page.getByTestId("user-detail-page")).toContainText(email);
}

async function openSelfUserDetail(page: Page, email: string) {
  await page.goto(APP_ROUTES.users, { waitUntil: "load" });
  const search = page.getByTestId("users-search-input");
  await search.fill(email);
  await expect(search).toHaveValue(email);
  await new Promise((resolve) => setTimeout(resolve, 450));

  const table = page.getByTestId("users-directory-table");
  const row = table.locator("tbody tr").filter({ hasText: email }).first();
  await expect(row).toBeVisible();
  await row.getByRole("link").click();
  await expect(page.getByTestId("user-detail-page")).toBeVisible();
}

test.describe("Delete user T–V", () => {
  test("T: own User detail and the Users list omit Delete", async ({ page }) => {
    const email = requireE2eEmail();
    await page.goto(APP_ROUTES.users, { waitUntil: "load" });
    await expect(page.getByRole("heading", { name: /^Users$/i })).toBeVisible();
    await expect(page.getByTestId("user-detail-delete")).toHaveCount(0);

    await openSelfUserDetail(page, email);
    await expect(page.getByTestId("user-detail-page")).toContainText(email);
    await expect(page.getByTestId("user-detail-delete")).toHaveCount(0);
  });

  test("U: Cancel closes the dialog and stays on User detail", async ({ page }) => {
    const email = `e2e-delete+${Date.now()}@example.com`;
    await createDisposableUser(page, email);

    await page.getByTestId("user-detail-delete").click();
    const dialog = page.getByTestId("user-detail-delete-dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.locator("[data-slot=alert-dialog-title]")).toHaveText(
      DELETE_USER_DIALOG_COPY,
    );
    await expect(dialog.locator("[data-slot=alert-dialog-description]")).toHaveCount(0);

    await page.getByTestId("user-detail-delete-cancel").click();
    await expect(dialog).toBeHidden();
    await expect(page.getByTestId("user-detail-page")).toBeVisible();
    await expect(page.getByTestId("user-detail-page")).toContainText(email);
    await expect(page).toHaveURL(/\/dashboard\/users\/[^/]+$/);
  });

  test("V: confirm Delete returns to the Users list and the detail URL is not found", async ({
    page,
  }) => {
    const email = `e2e-delete+${Date.now()}@example.com`;
    await createDisposableUser(page, email);
    const detailUrl = page.url();

    await page.getByTestId("user-detail-delete").click();
    await expect(page.getByTestId("user-detail-delete-dialog")).toBeVisible();
    await page.getByTestId("user-detail-delete-confirm").click();

    await expect(page.getByRole("heading", { name: /^Users$/i })).toBeVisible();
    await expectPath(page, APP_ROUTES.users);

    const search = page.getByTestId("users-search-input");
    await search.fill(email);
    await expect(search).toHaveValue(email);
    await new Promise((resolve) => setTimeout(resolve, 450));
    await expect(page.getByTestId("users-directory-table")).not.toContainText(email);

    await page.goto(detailUrl, { waitUntil: "load" });
    await expect(page.getByTestId("user-detail-not-found")).toHaveText("User not found");
  });
});
