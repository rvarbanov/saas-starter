import { test as setup } from "@playwright/test";
import { AUTH_STORAGE_PATH, ensureAuthStorageDir } from "../../playwright/env";
import { signInViaWorkOs } from "./helpers/workos-login";

setup("authenticate via WorkOS", async ({ page }) => {
  const email = process.env.E2E_WORKOS_EMAIL?.trim();
  const password = process.env.E2E_WORKOS_PASSWORD?.trim();
  if (!email || !password) {
    setup.skip(true, "Set E2E_WORKOS_EMAIL and E2E_WORKOS_PASSWORD in .secret");
    return;
  }

  await signInViaWorkOs(page, { email, password });
  ensureAuthStorageDir();
  await page.context().storageState({ path: AUTH_STORAGE_PATH });
});
