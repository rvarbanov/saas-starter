import { expect, type Page, test } from "@playwright/test";
import { APP_ROUTES } from "../../lib/app-routes";

function expectPath(page: Page, pathname: string) {
  return expect(page).toHaveURL((url) => {
    const current = url.pathname.replace(/\/$/, "") || "/";
    const expected = pathname.replace(/\/$/, "") || "/";
    return current === expected;
  });
}

async function openAccountMenu(page: Page) {
  await page.getByRole("button", { name: /^Account$/i }).click();
}

test("E: dashboard shows the App frame and not the public-site frame", async ({ page }) => {
  await page.goto(APP_ROUTES.dashboard, { waitUntil: "load" });
  await expect(page.getByRole("heading", { name: /Signed in/i })).toBeVisible();
  await expect(page.getByTestId("app-sidebar")).toBeVisible();
  await expect(page.getByTestId("app-topbar")).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Global" })).toHaveCount(0);
  await expect(page.locator("footer.site-footer")).toHaveCount(0);
  await expect(page.getByTestId("app-footer")).toBeVisible();
});

test("F: Global nav tours Dashboard, Users, Coming soon", async ({ page }) => {
  await page.goto(APP_ROUTES.dashboard, { waitUntil: "load" });
  await expect(page.getByRole("heading", { name: /Signed in/i })).toBeVisible();
  const nav = page.getByRole("navigation", { name: "App" });
  await expect(nav).toBeVisible();

  await nav.getByRole("link", { name: /^Users$/i }).click();
  await expectPath(page, APP_ROUTES.users);
  await expect(page.getByRole("heading", { name: /^Users$/i })).toBeVisible();

  await nav.getByRole("link", { name: /^Coming soon$/i }).click();
  await expectPath(page, APP_ROUTES.comingSoon);
  await expect(page.getByRole("heading", { name: /^Coming soon$/i })).toBeVisible();

  await nav.getByRole("link", { name: /^Dashboard$/i }).click();
  await expectPath(page, APP_ROUTES.dashboard);
  await expect(page.getByRole("heading", { name: /Signed in/i })).toBeVisible();
});

test("G: Avatar menu opens Settings and Profile; those are not Global nav links", async ({
  page,
}) => {
  await page.goto(APP_ROUTES.dashboard, { waitUntil: "load" });
  const nav = page.getByRole("navigation", { name: "App" });
  await expect(nav.getByRole("link", { name: /^Settings$/i })).toHaveCount(0);
  await expect(nav.getByRole("link", { name: /^Profile$/i })).toHaveCount(0);

  await openAccountMenu(page);
  await page.getByRole("menuitem", { name: /^Settings$/i }).click();
  await expectPath(page, APP_ROUTES.settings);
  await expect(page.getByRole("heading", { name: /^Account$/i })).toBeVisible();

  await openAccountMenu(page);
  await page.getByRole("menuitem", { name: /^Profile$/i }).click();
  await expectPath(page, APP_ROUTES.profile);
  await expect(page.getByRole("heading", { name: /^Your name$/i })).toBeVisible();
});

test("H: Users list shows the table, column headers, and at least one row", async ({ page }) => {
  await page.goto(APP_ROUTES.users, { waitUntil: "load" });
  await expect(page.getByRole("heading", { name: /^Users$/i })).toBeVisible();
  const table = page.getByTestId("users-directory-table");
  await expect(table).toBeVisible();
  await expect(table.getByRole("columnheader", { name: "First name" })).toBeVisible();
  await expect(table.getByRole("columnheader", { name: "Last name" })).toBeVisible();
  await expect(table.getByRole("columnheader", { name: "Email" })).toBeVisible();
  await expect(table.getByRole("columnheader", { name: "Created at" })).toBeVisible();
  await expect(table.getByRole("columnheader", { name: "Updated at" })).toBeVisible();
  await expect(table.locator("tbody tr")).not.toHaveCount(0);
  await expect(table.getByRole("cell", { name: /@/ }).first()).toBeVisible();
});

test("I: Demo page shows title, chart, table, 30d range, and next page", async ({ page }) => {
  await page.goto(APP_ROUTES.comingSoon, { waitUntil: "load" });
  await expect(page.getByRole("heading", { name: /^Coming soon$/i })).toBeVisible();
  await expect(
    page.getByText("Illustrative demo metrics — not connected to live data."),
  ).toBeVisible();
  await expect(page.getByTestId("coming-soon-chart")).toBeVisible();
  await expect(page.getByTestId("coming-soon-table")).toBeVisible();

  await page.getByRole("button", { name: /^30d$/ }).click();
  await expect(page.getByText("Last 30 days")).toBeVisible();

  await page.getByTestId("coming-soon-table-next").click();
  await expect(page.getByText("Page 2 of 3")).toBeVisible();
});
