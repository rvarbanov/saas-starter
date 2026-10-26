import { expect, type Page, test } from "@playwright/test";
import { APP_ROUTES, createUserPath } from "../../lib/app-routes";
import { ACCESS_ROLE_STORAGE } from "../../playwright/env";

function creds(emailKey: string, passwordKey: string): { email: string } | null {
  const email = process.env[emailKey]?.trim();
  const password = process.env[passwordKey]?.trim();
  if (!email || !password) {
    return null;
  }
  return { email };
}

function pathMatches(url: URL, pathname: string): boolean {
  const current = url.pathname.replace(/\/$/, "") || "/";
  const expected = pathname.replace(/\/$/, "") || "/";
  return current === expected;
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
  await expect(page).toHaveURL((url) => pathMatches(url, pathname));
}

async function openUsersList(page: Page) {
  await page.goto(APP_ROUTES.users, { waitUntil: "load" });
  await expect(page.getByRole("heading", { name: /^Users$/i })).toBeVisible();
  await expect(page.locator("[data-app-nav='Users']")).toBeVisible();
}

async function openUserByEmail(page: Page, email: string) {
  await openUsersList(page);
  const search = page.getByTestId("users-search-input");
  await search.fill(email);
  await expect(search).toHaveValue(email);
  await new Promise((resolve) => setTimeout(resolve, 450));
  const row = page
    .getByTestId("users-list-table")
    .locator("tbody tr")
    .filter({ hasText: email })
    .first();
  await expect(row).toBeVisible();
  await row.getByRole("link").click();
  await expect(page.getByTestId("user-detail-page")).toBeVisible();
  await expect(page.getByTestId("user-detail-page")).toContainText(email);
}

async function createDisposableUser(page: Page) {
  const email = `e2e-access+${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  await openUsersList(page);
  await clickPathLink(page, "create-user-entry", createUserPath());
  await expect(page.getByTestId("create-user-page")).toBeVisible();
  await page.getByTestId("create-user-email").fill(email);
  await page.getByTestId("create-user-submit").click();
  await expect(page.getByTestId("user-detail-page")).toBeVisible();
  await expect(page.getByTestId("user-detail-page")).toContainText(email);
  return email;
}

async function expectAdminChrome(page: Page) {
  await openUsersList(page);
  await expect(page.getByTestId("create-user-entry")).toBeVisible();
  const email = await createDisposableUser(page);
  await expect(page.getByTestId("user-detail-delete")).toBeVisible();
  await page.getByTestId("user-detail-delete").click();
  await expect(page.getByTestId("user-detail-delete-dialog")).toBeVisible();
  await page.getByTestId("user-detail-delete-confirm").click();
  await expect(page.getByRole("heading", { name: /^Users$/i })).toBeVisible();
  const search = page.getByTestId("users-search-input");
  await search.fill(email);
  await expect(search).toHaveValue(email);
  await new Promise((resolve) => setTimeout(resolve, 450));
  await expect(page.getByTestId("users-list-table")).not.toContainText(email);
}

const sysAdm = creds("E2E_SYS_ADM_EMAIL", "E2E_SYS_ADM_PASSWORD");
const usrAdm = creds("E2E_USR_ADM_EMAIL", "E2E_USR_ADM_PASSWORD");
const usrMgr = creds("E2E_USR_MGR_EMAIL", "E2E_USR_MGR_PASSWORD");
const usrVwr = creds("E2E_USR_VWR_EMAIL", "E2E_USR_VWR_PASSWORD");
const targetEmail = process.env.E2E_SYS_ADM_TARGET_EMAIL?.trim();
const targetPassword = process.env.E2E_SYS_ADM_TARGET_PASSWORD?.trim();
const noRole = creds("E2E_NO_ROLE_EMAIL", "E2E_NO_ROLE_PASSWORD");

if (sysAdm) {
  test.describe("Z System admin", () => {
    test.use({ storageState: ACCESS_ROLE_STORAGE.SYS_ADM });

    test("Z: Users nav, list, Create, and Delete on another user", async ({ page }) => {
      await expectAdminChrome(page);
    });
  });
} else {
  test.skip("Z: System admin Users chrome", () => {});
}

if (usrAdm) {
  test.describe("AA Users admin", () => {
    test.use({ storageState: ACCESS_ROLE_STORAGE.USR_ADM });

    test("AA: same Users chrome as System admin", async ({ page }) => {
      await expectAdminChrome(page);
    });
  });
} else {
  test.skip("AA: Users admin Users chrome", () => {});
}

if (usrMgr) {
  test.describe("AB–AC Users manager", () => {
    test.use({ storageState: ACCESS_ROLE_STORAGE.USR_MGR });

    test("AB: Users nav, list, and Create, without Delete", async ({ page }) => {
      await openUsersList(page);
      await expect(page.getByTestId("create-user-entry")).toBeVisible();
      await createDisposableUser(page);
      await expect(page.getByTestId("user-detail-delete")).toHaveCount(0);
    });

    test("AC: Edit User loads", async ({ page }) => {
      await openUserByEmail(page, usrMgr.email);
      const detail = new URL(page.url());
      await page.goto(`${detail.pathname}/edit`, { waitUntil: "load" });
      await expect(page.getByTestId("edit-user-page")).toBeVisible();
    });
  });
} else {
  test.skip("AB: Users manager without Delete", () => {});
  test.skip("AC: Users manager Edit User", () => {});
}

if (usrVwr) {
  test.describe("AD–AF Users viewer", () => {
    test.use({ storageState: ACCESS_ROLE_STORAGE.USR_VWR });

    test("AD: list and detail without Create, Delete, or Changes", async ({ page }) => {
      await openUsersList(page);
      await expect(page.getByTestId("create-user-entry")).toHaveCount(0);
      await openUserByEmail(page, usrVwr.email);
      await expect(page.getByTestId("user-detail-delete")).toHaveCount(0);
      await expect(page.getByTestId("user-detail-changes")).toHaveCount(0);
    });

    test("AE: Create User is Unauthorized", async ({ page }) => {
      await page.goto(APP_ROUTES.usersNew, { waitUntil: "load" });
      await expect(page.getByTestId("unauthorized-empty")).toBeVisible();
      await expect(page.getByRole("heading", { name: "Unauthorized" })).toBeVisible();
      await expect(page.getByText("You do not have access to this page.")).toBeVisible();
      await expect(page).toHaveURL((url) => pathMatches(url, APP_ROUTES.usersNew));
      await expect(page.locator("[data-app-nav='Users']")).toBeVisible();
    });

    test("AF: Edit User is Unauthorized", async ({ page }) => {
      await openUserByEmail(page, usrVwr.email);
      const detail = new URL(page.url());
      await page.goto(`${detail.pathname}/edit`, { waitUntil: "load" });
      await expect(page.getByTestId("unauthorized-empty")).toBeVisible();
      await expect(page).toHaveURL(/\/dashboard\/users\/[^/]+\/edit$/);
    });
  });
} else {
  test.skip("AD: Users viewer list and detail", () => {});
  test.skip("AE: Users viewer Create User", () => {});
  test.skip("AF: Users viewer Edit User", () => {});
}

if (usrAdm && targetEmail && targetPassword) {
  test.describe("AG Delete System admin subject", () => {
    test.use({ storageState: ACCESS_ROLE_STORAGE.USR_ADM });

    test("AG: Delete of a System admin subject fails and the user stays listed", async ({
      page,
    }) => {
      await openUserByEmail(page, targetEmail);
      const detailPath = new URL(page.url()).pathname;
      await page.getByTestId("user-detail-delete").click();
      await expect(page.getByTestId("user-detail-delete-dialog")).toBeVisible();
      await page.getByTestId("user-detail-delete-confirm").click();
      await expect(page.getByTestId("user-detail-delete-error")).toBeVisible();
      await expect(page.getByTestId("user-detail-delete-error")).toContainText("System admin");
      await expect(page).toHaveURL((url) => pathMatches(url, detailPath));
      await openUsersList(page);
      const search = page.getByTestId("users-search-input");
      await search.fill(targetEmail);
      await expect(search).toHaveValue(targetEmail);
      await new Promise((resolve) => setTimeout(resolve, 450));
      await expect(page.getByTestId("users-list-table")).toContainText(targetEmail);
    });
  });
} else {
  test.skip("AG: Users admin cannot delete a System admin subject", () => {});
}

async function expectUnauthorizedUsersPage(page: Page, pathname: string) {
  await page.goto(pathname, { waitUntil: "load" });
  await expect(page.getByTestId("unauthorized-empty")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Unauthorized" })).toBeVisible();
  await expect(page.getByText("You do not have access to this page.")).toBeVisible();
  await expect(page).toHaveURL((url) => pathMatches(url, pathname));
  await expect(page.getByTestId("users-nav-pending")).toHaveCount(0);
  await expect(page.locator("[data-app-nav='Users']")).toHaveCount(0);
}

if (noRole) {
  test.describe("AH No roles", () => {
    test.use({ storageState: ACCESS_ROLE_STORAGE.NO_ROLE });

    test("AH: Dashboard, Coming soon, and Profile only", async ({ page }) => {
      await page.goto(APP_ROUTES.dashboard, { waitUntil: "load" });
      await expect(page.getByRole("heading", { name: /Signed in/i })).toBeVisible();
      await expect(page.locator("[data-app-nav='Dashboard']")).toBeVisible();
      await expect(page.locator("[data-app-nav='Coming soon']")).toBeVisible();
      await expect(page.getByTestId("users-nav-pending")).toHaveCount(0);
      await expect(page.locator("[data-app-nav='Users']")).toHaveCount(0);

      await page.goto(APP_ROUTES.comingSoon, { waitUntil: "load" });
      await expect(page.getByRole("heading", { name: /^Coming soon$/i })).toBeVisible();
      await expect(page.getByTestId("unauthorized-empty")).toHaveCount(0);

      await page.goto(APP_ROUTES.profile, { waitUntil: "load" });
      await expect(page.getByTestId("profile-form")).toBeVisible({ timeout: 15_000 });
      await expect(page.getByTestId("profile-email")).toHaveValue(noRole.email);
      await expect(page.getByTestId("profile-roles")).toHaveText("None");

      await expectUnauthorizedUsersPage(page, APP_ROUTES.users);
      await expectUnauthorizedUsersPage(page, APP_ROUTES.usersNew);
    });
  });
} else {
  test.skip("AH: no roles sees Dashboard, Coming soon, and Profile, not Users", () => {});
}
