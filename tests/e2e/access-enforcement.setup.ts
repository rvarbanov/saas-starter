import { test as setup } from "@playwright/test";
import { ACCESS_ROLE_STORAGE, ensureAuthStorageDir } from "../../playwright/env";
import { signInViaWorkOs } from "./helpers/workos-login";

const ROLES = [
  {
    name: "System admin",
    emailKey: "E2E_SYS_ADM_EMAIL",
    passwordKey: "E2E_SYS_ADM_PASSWORD",
    storage: ACCESS_ROLE_STORAGE.SYS_ADM,
  },
  {
    name: "Users admin",
    emailKey: "E2E_USR_ADM_EMAIL",
    passwordKey: "E2E_USR_ADM_PASSWORD",
    storage: ACCESS_ROLE_STORAGE.USR_ADM,
  },
  {
    name: "Users manager",
    emailKey: "E2E_USR_MGR_EMAIL",
    passwordKey: "E2E_USR_MGR_PASSWORD",
    storage: ACCESS_ROLE_STORAGE.USR_MGR,
  },
  {
    name: "Users viewer",
    emailKey: "E2E_USR_VWR_EMAIL",
    passwordKey: "E2E_USR_VWR_PASSWORD",
    storage: ACCESS_ROLE_STORAGE.USR_VWR,
  },
] as const;

for (const role of ROLES) {
  const email = process.env[role.emailKey]?.trim();
  const password = process.env[role.passwordKey]?.trim();
  if (!email || !password) {
    setup.skip(`authenticate ${role.name}`, () => {
      // Missing Role secrets skip this login. The spec skips the same Role.
    });
    continue;
  }

  setup(`authenticate ${role.name}`, async ({ page }) => {
    await signInViaWorkOs(page, { email, password });
    ensureAuthStorageDir();
    await page.context().storageState({ path: role.storage });
  });
}
