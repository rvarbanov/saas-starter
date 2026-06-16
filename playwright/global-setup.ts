import { getCanonicalPlaywrightOrigin, loadPlaywrightEnv } from "./env";

export default async function globalSetup(): Promise<void> {
  loadPlaywrightEnv();
  if (process.env.CI) {
    console.log(`E2E: baseURL ${getCanonicalPlaywrightOrigin()}`);
  }
}
