import { expect, type Page } from "@playwright/test";

export type WorkOsLoginCredentials = {
  email: string;
  password: string;
};

/** Fill AuthKit hosted email + password and wait for the app callback to finish. */
export async function completeWorkOsHostedLogin(
  page: Page,
  { email, password }: WorkOsLoginCredentials,
): Promise<void> {
  // Prefer role: AuthKit may expose the email control without a <label> association.
  const emailField = page.getByRole("textbox", { name: /^email$/i });

  // Session reuse skips the form and returns straight to the app.
  const alreadyOnDashboard = await page
    .waitForURL(/\/dashboard/, { timeout: 3_000 })
    .then(() => true)
    .catch(() => false);
  if (alreadyOnDashboard) {
    await expect(page.getByRole("heading", { name: /Signed in/i })).toBeVisible();
    return;
  }

  await expect(emailField).toBeVisible({ timeout: 30_000 });
  await emailField.fill(email);
  await page.getByRole("button", { name: /continue/i }).click();

  // Prefer role over getByLabel: WorkOS also exposes aria-label="Show password".
  const passwordField = page.getByRole("textbox", { name: /password/i });
  await expect(passwordField).toBeVisible({ timeout: 15_000 });
  await passwordField.fill(password);
  await page.getByRole("button", { name: /sign in|log in/i }).click();

  await page.waitForURL(/\/dashboard/, { timeout: 60_000 });
  await expect(page.getByRole("heading", { name: /Signed in/i })).toBeVisible();
}

/** Full WorkOS AuthKit login via sign-in → dashboard redirect → hosted UI. */
export async function signInViaWorkOs(
  page: Page,
  credentials: WorkOsLoginCredentials,
): Promise<void> {
  await page.goto("/sign-in");
  await page.getByRole("link", { name: /Continue to sign in/i }).click();
  await completeWorkOsHostedLogin(page, credentials);
}

/**
 * Start OAuth from a protected route (sets PKCE verifier cookie), then land on AuthKit.
 * Does not complete the hosted login — use for mid-login race coverage.
 */
export async function beginDashboardAuthRedirect(page: Page): Promise<void> {
  await page.goto("/dashboard");
  await page.waitForURL(/authkit\.app|workos/i, { timeout: 30_000 });
}

/** Sign out from the dashboard account menu and wait until home shows Sign in. */
export async function signOutFromDashboard(page: Page, appOrigin: string): Promise<void> {
  await page.goto("/dashboard", { waitUntil: "load" });
  await expect(page.getByRole("heading", { name: /Signed in/i })).toBeVisible();

  await page.getByRole("button", { name: /^Account$/i }).click();
  await Promise.all([
    page.waitForURL((url) => url.origin === appOrigin && url.pathname === "/", {
      timeout: 60_000,
      waitUntil: "load",
    }),
    page.getByRole("menuitem", { name: /^Sign out$/i }).click(),
  ]);

  const nav = page.getByRole("navigation", { name: "Global" });
  await expect(nav.getByRole("link", { name: /^Sign in$/i })).toBeVisible();
}
