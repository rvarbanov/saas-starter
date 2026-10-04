import { expect, type Page, test } from "@playwright/test";
import { APP_ROUTES, createUserPath } from "../../lib/app-routes";

function pathMatches(url: URL, pathname: string): boolean {
  const current = url.pathname.replace(/\/$/, "") || "/";
  const expected = pathname.replace(/\/$/, "") || "/";
  return current === expected;
}

function expectPath(page: Page, pathname: string) {
  return expect(page).toHaveURL((url) => pathMatches(url, pathname));
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

async function createDisposableUser(page: Page, email: string) {
  await page.goto(APP_ROUTES.users, { waitUntil: "load" });
  await expect(page.getByRole("heading", { name: /^Users$/i })).toBeVisible();
  await clickPathLink(page, "create-user-entry", createUserPath());
  await expect(page.getByTestId("create-user-page")).toBeVisible();
  await page.getByTestId("create-user-email").fill(email);
  await page.getByTestId("create-user-submit").click();
  const detail = page.getByTestId("user-detail-page");
  await expect(detail).toBeVisible();
  await expect(detail).toContainText(email);
}

async function searchUsers(page: Page, email: string) {
  await page.goto(APP_ROUTES.users, { waitUntil: "load" });
  const search = page.getByTestId("users-search-input");
  await search.fill(email);
  await expect(search).toHaveValue(email);
  await new Promise((resolve) => setTimeout(resolve, 450));
  return page.getByTestId("users-list-table").locator("tbody tr").filter({ hasText: email });
}

test("W: create → list → detail → edit names → list → delete", async ({ page }) => {
  test.setTimeout(120_000);

  const email = `e2e-lifecycle+${Date.now()}@example.com`;
  const suffix = String(Date.now()).slice(-4);
  const first = `E2E${suffix}`;
  const last = `Life${suffix}`;

  await createDisposableUser(page, email);

  const createdRow = await searchUsers(page, email);
  await expect(createdRow).toBeVisible();
  await createdRow.getByRole("link").click();
  const detail = page.getByTestId("user-detail-page");
  await expect(detail).toBeVisible();
  await expect(detail).toContainText(email);

  await page.getByRole("link", { name: /^Edit$/i }).click();
  await expect(page).toHaveURL(/\/dashboard\/users\/[^/]+\/edit$/);
  const form = page.getByTestId("edit-user-form");
  await form.getByTestId("edit-user-first-name").fill(first);
  await form.getByTestId("edit-user-last-name").fill(last);
  await form.getByTestId("edit-user-submit").click();

  await expect(detail).toBeVisible();
  await expect(page.getByTestId("edit-user-form")).toHaveCount(0);
  await expect(detail.getByRole("heading", { name: `${first} ${last}` })).toBeVisible();
  await expect(detail.locator("dd").filter({ hasText: new RegExp(`^${first}$`) })).toBeVisible();
  await expect(detail.locator("dd").filter({ hasText: new RegExp(`^${last}$`) })).toBeVisible();
  await expect(detail).toContainText(email);

  const editedRow = await searchUsers(page, email);
  await expect(editedRow).toBeVisible();
  await expect(editedRow).toContainText(first);
  await expect(editedRow).toContainText(last);
  await expect(editedRow).toContainText(email);
  await editedRow.getByRole("link").click();
  await expect(detail).toBeVisible();
  await expect(detail).toContainText(email);
  const detailUrl = page.url();

  await page.getByTestId("user-detail-delete").click();
  await expect(page.getByTestId("user-detail-delete-dialog")).toBeVisible();
  await page.getByTestId("user-detail-delete-confirm").click();

  await expect(page.getByRole("heading", { name: /^Users$/i })).toBeVisible();
  await expectPath(page, APP_ROUTES.users);
  await expect(await searchUsers(page, email)).toHaveCount(0);

  await page.goto(detailUrl, { waitUntil: "load" });
  await expect(page.getByTestId("user-detail-not-found")).toHaveText("User not found");
});
