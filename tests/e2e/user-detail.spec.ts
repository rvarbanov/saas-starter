import { expect, type Page, test } from "@playwright/test";
import { APP_ROUTES } from "../../lib/app-routes";

function expectPath(page: Page, pathname: string) {
  return expect(page).toHaveURL((url) => {
    const current = url.pathname.replace(/\/$/, "") || "/";
    const expected = pathname.replace(/\/$/, "") || "/";
    return current === expected;
  });
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

test.describe("User detail K–O", () => {
  test("K: search E2E email → row → User detail", async ({ page }) => {
    const email = requireE2eEmail();
    await openSelfUserDetail(page, email);
    await expect(page).toHaveURL(/\/dashboard\/users\/[^/]+$/);
  });

  test("L: breadcrumbs Dashboard → Users → leaf; Users returns to list", async ({ page }) => {
    const email = requireE2eEmail();
    await openSelfUserDetail(page, email);

    const topbar = page.getByTestId("app-topbar");
    await expect(topbar.getByRole("link", { name: /^Dashboard$/i })).toBeVisible();
    await expect(topbar.getByRole("link", { name: /^Users$/i })).toBeVisible();

    await topbar.getByRole("link", { name: /^Users$/i }).click();
    await expectPath(page, APP_ROUTES.users);
    await expect(page.getByRole("heading", { name: /^Users$/i })).toBeVisible();
  });

  test("M: view shows App user fields including identity links", async ({ page }) => {
    const email = requireE2eEmail();
    await openSelfUserDetail(page, email);

    const detail = page.getByTestId("user-detail-page");
    await expect(detail.getByText("App user id")).toBeVisible();
    await expect(detail.getByText("Token identifier")).toBeVisible();
    await expect(detail.getByText("WorkOS user id")).toBeVisible();
    await expect(detail.getByText("Convex id")).toBeVisible();
    await expect(detail.getByRole("link", { name: /^Edit$/i })).toBeVisible();
  });

  test("N: edit first/last name → Save → view shows new values", async ({ page }) => {
    const email = requireE2eEmail();
    await openSelfUserDetail(page, email);

    await page.getByRole("link", { name: /^Edit$/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/users\/[^/]+\/edit$/);
    const form = page.getByTestId("edit-user-form");
    await expect(form).toBeVisible();

    const suffix = String(Date.now()).slice(-4);
    const first = `E2E${suffix}`;
    const last = `User${suffix}`;
    await form.getByTestId("edit-user-first-name").fill(first);
    await form.getByTestId("edit-user-last-name").fill(last);
    await form.getByTestId("edit-user-submit").click();

    await expect(page.getByTestId("user-detail-page")).toBeVisible();
    await expect(page.getByTestId("edit-user-form")).toHaveCount(0);
    const detail = page.getByTestId("user-detail-page");
    await expect(detail.getByRole("heading", { name: `${first} ${last}` })).toBeVisible();
    await expect(detail.locator("dd").filter({ hasText: new RegExp(`^${first}$`) })).toBeVisible();
    await expect(detail.locator("dd").filter({ hasText: new RegExp(`^${last}$`) })).toBeVisible();
  });

  test("O: edit → change name → Cancel → view unchanged", async ({ page }) => {
    const email = requireE2eEmail();
    await openSelfUserDetail(page, email);

    const detail = page.getByTestId("user-detail-page");
    const before = await detail.locator("h1").innerText();

    await page.getByRole("link", { name: /^Edit$/i }).click();
    const form = page.getByTestId("edit-user-form");
    await form.getByTestId("edit-user-first-name").fill("ShouldNotPersist");
    await form.getByTestId("edit-user-cancel").click();

    await expect(page.getByTestId("user-detail-page")).toBeVisible();
    await expect(page.getByTestId("edit-user-form")).toHaveCount(0);
    await expect(detail.locator("h1")).toHaveText(before);
    await expect(page.getByText("ShouldNotPersist")).toHaveCount(0);
  });
});
