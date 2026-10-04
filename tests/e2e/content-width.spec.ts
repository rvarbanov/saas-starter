import { expect, type Page, test } from "@playwright/test";
import { APP_ROUTES } from "../../lib/app-routes";

const WIDE_VIEWPORT = { width: 1440, height: 900 };
const NARROW_VIEWPORT = { width: 1280, height: 720 };

const APP_PAGES = [
  APP_ROUTES.dashboard,
  APP_ROUTES.users,
  APP_ROUTES.comingSoon,
  APP_ROUTES.settings,
  APP_ROUTES.profile,
  APP_ROUTES.usersNew,
] as const;

const COLUMN_HEADERS = [
  "First name",
  "Last name",
  "Email",
  "Roles",
  "Created at",
  "Updated at",
] as const;

function usersTable(page: Page) {
  return page.getByTestId("users-list-table");
}

function tableContainer(page: Page) {
  return usersTable(page).locator("[data-slot=table-container]");
}

async function expectSingleContentArea(page: Page) {
  await expect(page.locator(".content-area")).toHaveCount(1);
  await expect(page.locator(".page-main")).toHaveCount(0);
}

async function openUsersList(page: Page) {
  await page.goto(APP_ROUTES.users, { waitUntil: "load" });
  const row = usersTable(page).locator("tbody tr").first();
  await expect(row.getByRole("link")).toBeVisible();
  return row;
}

test("wide viewport: App pages use content-area", async ({ page }) => {
  await page.setViewportSize(WIDE_VIEWPORT);

  for (const path of APP_PAGES) {
    await page.goto(path, { waitUntil: "load" });
    await expectSingleContentArea(page);
  }

  const row = await openUsersList(page);
  await row.getByRole("link").click();
  const detail = page.getByTestId("user-detail-page");
  await expect(detail).toBeVisible();
  await expect(detail).toHaveClass(/content-area/);
  await expectSingleContentArea(page);

  await page.getByRole("link", { name: /^Edit$/i }).click();
  const edit = page.getByTestId("edit-user-page");
  await expect(edit).toBeVisible();
  await expect(edit).toHaveClass(/content-area/);
  await expectSingleContentArea(page);
});

test("wide viewport: Users list fits and gives Email the leftover width", async ({ page }) => {
  await page.setViewportSize(WIDE_VIEWPORT);
  const row = await openUsersList(page);

  for (const header of COLUMN_HEADERS) {
    await expect(usersTable(page).getByRole("columnheader", { name: header })).toBeVisible();
  }

  const container = tableContainer(page);
  const containerSize = await container.evaluate((el) => ({
    scrollWidth: el.scrollWidth,
    clientWidth: el.clientWidth,
  }));
  expect(containerSize.scrollWidth).toBeLessThanOrEqual(containerSize.clientWidth);

  const createdAt = row.locator("td").nth(4);
  const createdAtSize = await createdAt.evaluate((el) => ({
    scrollWidth: el.scrollWidth,
    clientWidth: el.clientWidth,
  }));
  expect(createdAtSize.scrollWidth).toBeLessThanOrEqual(createdAtSize.clientWidth);

  const emailBox = await row.locator("td").nth(2).boundingBox();
  const firstNameBox = await row.locator("td").nth(0).boundingBox();
  expect(emailBox).not.toBeNull();
  expect(firstNameBox).not.toBeNull();
  expect(emailBox?.width ?? 0).toBeGreaterThan(firstNameBox?.width ?? 0);
});

test("narrow viewport: Users list scrolls and keeps every column", async ({ page }) => {
  await page.setViewportSize(NARROW_VIEWPORT);
  await openUsersList(page);

  const containerSize = await tableContainer(page).evaluate((el) => ({
    scrollWidth: el.scrollWidth,
    clientWidth: el.clientWidth,
  }));
  expect(containerSize.scrollWidth).toBeGreaterThan(containerSize.clientWidth);

  for (const header of COLUMN_HEADERS) {
    await expect(usersTable(page).getByRole("columnheader", { name: header })).toHaveCount(1);
  }
});
