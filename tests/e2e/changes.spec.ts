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

function requireE2eEmail(): string {
  const email = process.env.E2E_WORKOS_EMAIL?.trim();
  if (!email) {
    test.skip(true, "E2E_WORKOS_EMAIL required");
    return "";
  }
  return email;
}

async function openSelfUserDetail(page: Page, email: string) {
  await page.goto(APP_ROUTES.users, { waitUntil: "load" });
  const search = page.getByTestId("users-search-input");
  await search.fill(email);
  await expect(search).toHaveValue(email);
  await new Promise((resolve) => setTimeout(resolve, 450));

  const table = page.getByTestId("users-list-table");
  const row = table.locator("tbody tr").filter({ hasText: email }).first();
  await expect(row).toBeVisible();
  await row.getByRole("link").click();
  await expect(page.getByTestId("user-detail-page")).toBeVisible();
}

async function openCreateUser(page: Page) {
  await page.goto(APP_ROUTES.users, { waitUntil: "load" });
  await expect(page.getByRole("heading", { name: /^Users$/i })).toBeVisible();
  await clickPathLink(page, "create-user-entry", createUserPath());
  await expect(page.getByTestId("create-user-page")).toBeVisible();
}

test("X: Edit User leaves an update on User detail", async ({ page }) => {
  const email = requireE2eEmail();
  await openSelfUserDetail(page, email);
  await page.getByRole("link", { name: /^Edit$/i }).click();
  await expect(page.getByTestId("edit-user-page")).toBeVisible();

  const firstName = page.getByTestId("edit-user-first-name");
  const previous = await firstName.inputValue();
  const next = `X${Date.now()}`;
  await firstName.fill(next);
  await page.getByTestId("edit-user-submit").click();

  const detail = page.getByTestId("user-detail-page");
  await expect(detail).toBeVisible();
  const heading = await detail.locator("h1").innerText();
  const row = detail.getByTestId("user-detail-change").filter({ hasText: next }).first();
  await expect(row).toContainText("Update");
  await expect(row).toContainText(heading);
  await expect(row).toContainText("First name");
  await expect(row).toContainText(previous.trim().length > 0 ? previous.trim() : "—");
  await expect(row).toContainText(next);

  const rows = detail.getByTestId("user-detail-change");
  if ((await rows.count()) < 20) {
    await expect(detail.getByTestId("user-detail-changes-load-older")).toHaveCount(0);
  }

  await page.getByRole("link", { name: /^Edit$/i }).click();
  const restore = page.getByTestId("edit-user-first-name");
  await expect(restore).toBeVisible();
  await restore.fill(previous);
  await page.getByTestId("edit-user-submit").click();
  await expect(page.getByTestId("user-detail-page")).toBeVisible();
});

test("Y: Create User leaves a create on User detail", async ({ page }) => {
  const email = requireE2eEmail();
  await openSelfUserDetail(page, email);
  const actorLabel = await page.getByTestId("user-detail-page").locator("h1").innerText();

  await openCreateUser(page);
  const createdEmail = `e2e-change+${Date.now()}@example.com`;
  const firstName = `Change${Date.now()}`;
  await page.getByTestId("create-user-first-name").fill(firstName);
  await page.getByTestId("create-user-email").fill(createdEmail);
  await page.getByTestId("create-user-submit").click();

  const detail = page.getByTestId("user-detail-page");
  await expect(detail).toBeVisible();
  const row = detail.getByTestId("user-detail-change").first();
  await expect(row).toContainText("Create");
  await expect(row).toContainText(actorLabel);
  await expect(row).not.toContainText("Email");
  await expect(detail.getByTestId("user-detail-changes-load-older")).toHaveCount(0);
});
