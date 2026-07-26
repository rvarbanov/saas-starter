import { test as setup } from "@playwright/test";
import { AUTH_STORAGE_PATH, ensureAuthStorageDir } from "../../playwright/env";
import { signInViaWorkOs } from "./helpers/workos-login";

setup("authenticate via WorkOS", async ({ page }) => {
  const email = process.env.E2E_WORKOS_EMAIL?.trim();
  const password = process.env.E2E_WORKOS_PASSWORD?.trim();
  if (!email || !password) {
    // playwright.config.ts already fail-fasts; keep a clear error if setup is run alone.
    throw new Error("Set E2E_WORKOS_EMAIL and E2E_WORKOS_PASSWORD for authenticated e2e");
  }

  await signInViaWorkOs(page, { email, password });
  ensureAuthStorageDir();
  await page.context().storageState({ path: AUTH_STORAGE_PATH });
});
