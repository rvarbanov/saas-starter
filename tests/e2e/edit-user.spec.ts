import { expect, type Page, test } from "@playwright/test";
import { APP_ROUTES } from "../../lib/app-routes";

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

test("T: Edit link, crumbs, heading, and read-only roles", async ({ page }) => {
  const email = requireE2eEmail();
  await openSelfUserDetail(page, email);

  const edit = page.getByRole("link", { name: /^Edit$/i });
  await expect(edit).toHaveAttribute("href", /\/dashboard\/users\/[^/]+\/edit$/);
  await edit.click();
  await expect(page).toHaveURL(/\/dashboard\/users\/[^/]+\/edit$/);

  const topbar = page.getByTestId("app-topbar");
  await expect(topbar.getByRole("link", { name: /^Dashboard$/i })).toBeVisible();
  await expect(topbar.getByRole("link", { name: /^Users$/i })).toBeVisible();
  await expect(topbar.getByRole("link", { name: /^Edit$/i })).toHaveCount(0);
  await expect(topbar.getByText("Edit", { exact: true })).toBeVisible();

  await expect(page.getByRole("heading", { name: /^Edit user$/i })).toBeVisible();
  const roles = page.getByTestId("edit-user-roles");
  await expect(roles).toBeVisible();
  await expect(page.getByRole("checkbox")).toHaveCount(0);
});
