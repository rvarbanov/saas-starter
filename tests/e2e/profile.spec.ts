import { expect, test } from "@playwright/test";
import { APP_ROUTES } from "../../lib/app-routes";

function expectPath(pathname: string) {
  return (url: URL) => {
    const current = url.pathname.replace(/\/$/, "") || "/";
    const expected = pathname.replace(/\/$/, "") || "/";
    return current === expected;
  };
}

test("U: Profile saves a first name and stays on Profile", async ({ page }) => {
  await page.goto(APP_ROUTES.profile, { waitUntil: "load" });
  await expect(page.getByRole("heading", { name: /^Profile$/i })).toBeVisible();
  await expect(page.getByTestId("profile-form")).toBeVisible({ timeout: 15_000 });

  const email = page.getByTestId("profile-email");
  await expect(email).toHaveRole("textbox");
  const emailBefore = await email.inputValue();

  const roles = page.getByTestId("profile-roles");
  await expect(roles).toBeVisible();
  await expect(page.getByRole("checkbox")).toHaveCount(0);

  const suffix = String(Date.now()).slice(-4);
  const first = `E2E${suffix}`;
  await page.getByTestId("profile-first-name").fill(first);
  await page.getByTestId("profile-submit").click();

  await expect(page).toHaveURL(expectPath(APP_ROUTES.profile));
  await expect(page.getByTestId("profile-first-name")).toHaveValue(first);
  await expect(page.getByTestId("profile-email")).toHaveValue(emailBefore);
});

test("V: Profile Cancel resets the draft and stays on Profile", async ({ page }) => {
  await page.goto(APP_ROUTES.profile, { waitUntil: "load" });
  const firstName = page.getByTestId("profile-first-name");
  await expect(firstName).toBeVisible({ timeout: 15_000 });
  const before = await firstName.inputValue();

  await firstName.fill("ShouldNotPersist");
  await page.getByTestId("profile-cancel").click();

  await expect(page).toHaveURL(expectPath(APP_ROUTES.profile));
  await expect(page.getByTestId("profile-first-name")).toHaveValue(before);
  await expect(page.getByText("ShouldNotPersist")).toHaveCount(0);
});
