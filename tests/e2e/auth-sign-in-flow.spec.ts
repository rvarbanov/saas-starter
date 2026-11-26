import { expect, test, type BrowserContext } from "@playwright/test";
import { getCanonicalPlaywrightOrigin } from "../../playwright/env";
import {
  beginDashboardAuthRedirect,
  completeWorkOsHostedLogin,
  signInViaWorkOs,
  signOutFromDashboard,
  type WorkOsLoginCredentials,
} from "./helpers/workos-login";

/**
 * RAD-215: full sign-in workflow against real WorkOS AuthKit.
 *
 * Local / preview / prod:
 *   E2E_WORKOS_EMAIL + E2E_WORKOS_PASSWORD (and WORKOS_* for local webServer)
 *   PLAYWRIGHT_BASE_URL=https://… to hit a deployed origin (skips local webServer)
 *
 * The concurrent-tab case reproduces `OAuth state mismatch` on authkit-nextjs 3.0.0
 * when `/` or `/api/health` rewrite the shared `wos-auth-verifier` cookie mid-login.
 */
function requireCredentials(): WorkOsLoginCredentials {
  const email = process.env.E2E_WORKOS_EMAIL?.trim();
  const password = process.env.E2E_WORKOS_PASSWORD?.trim();
  if (!email || !password) {
    throw new Error("Set E2E_WORKOS_EMAIL and E2E_WORKOS_PASSWORD for auth-sign-in-flow e2e");
  }
  return { email, password };
}

async function clobberVerifierViaPublicRoutes(context: BrowserContext): Promise<void> {
  const interferer = await context.newPage();
  try {
    // Hit routes that still run through authkitProxy on 3.0.0 and rewrite the verifier.
    await interferer.goto("/", { waitUntil: "domcontentloaded" });
    await interferer.goto("/api/health", { waitUntil: "domcontentloaded" });
  } finally {
    await interferer.close();
  }
}

test.describe("AuthKit sign-in workflow (RAD-215)", () => {
  // Each case starts logged out; keep them independent so one failure still runs the others.
  test.describe.configure({ timeout: 120_000 });

  test("logged-out /dashboard → AuthKit email+password → /dashboard", async ({ page }) => {
    const credentials = requireCredentials();

    await page.goto("/dashboard");
    await page.waitForURL(/authkit\.app|workos/i, { timeout: 30_000 });
    await completeWorkOsHostedLogin(page, credentials);

    await expect(page).toHaveURL(/\/dashboard\/?$/);
    await expect(page.getByRole("heading", { name: /Signed in/i })).toBeVisible();
  });

  test("sign-in still succeeds when another tab hits / and /api/health mid-login", async ({
    page,
    context,
  }) => {
    const credentials = requireCredentials();

    await beginDashboardAuthRedirect(page);
    await clobberVerifierViaPublicRoutes(context);
    await completeWorkOsHostedLogin(page, credentials);

    await expect(page).toHaveURL(/\/dashboard\/?$/);
    await expect(page.getByRole("heading", { name: /Signed in/i })).toBeVisible();
  });

  test("sign out then sign in again in the same context", async ({ page, baseURL }) => {
    const credentials = requireCredentials();
    const appOrigin = baseURL ?? getCanonicalPlaywrightOrigin();

    await signInViaWorkOs(page, credentials);
    await signOutFromDashboard(page, appOrigin);

    await page.goto("/dashboard");
    await page.waitForURL(/authkit\.app|workos/i, { timeout: 30_000 });
    await completeWorkOsHostedLogin(page, credentials);

    await expect(page).toHaveURL(/\/dashboard\/?$/);
    await expect(page.getByRole("heading", { name: /Signed in/i })).toBeVisible();
  });

  test("failed /callback shows a readable error page, not raw AuthKit JSON", async ({ page }) => {
    const response = await page.goto("/callback?code=invalid&state=invalid", {
      waitUntil: "domcontentloaded",
    });
    expect(response).not.toBeNull();
    const contentType = response?.headers()["content-type"] ?? "";
    const body = await page.content();

    // Default AuthKit onError fallback is application/json with this description.
    expect(contentType).not.toMatch(/application\/json/i);
    expect(body).not.toMatch(/Couldn't sign in\. If you are not sure what happened/i);

    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
    await expect(page.getByText(/try again|couldn't complete|sign-in failed/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /try again|sign in/i })).toBeVisible();
  });
});
