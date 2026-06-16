import { expect, type Page } from "@playwright/test";

export type WorkOsLoginCredentials = {
  email: string;
  password: string;
};

/** Full WorkOS AuthKit login via sign-in → dashboard redirect → hosted UI. */
export async function signInViaWorkOs(
  page: Page,
  { email, password }: WorkOsLoginCredentials,
): Promise<void> {
  await page.goto("/sign-in");
  await page.getByRole("link", { name: /Continue to sign in/i }).click();

  await page.getByLabel(/email/i).fill(email);
  await page.getByRole("button", { name: /continue/i }).click();

  const passwordField = page.getByLabel(/password/i);
  await expect(passwordField).toBeVisible({ timeout: 15_000 });
  await passwordField.fill(password);
  await page.getByRole("button", { name: /sign in|log in/i }).click();

  await page.waitForURL(/\/dashboard/, { timeout: 60_000 });
  await expect(page.getByRole("heading", { name: /Signed in/i })).toBeVisible();
}
