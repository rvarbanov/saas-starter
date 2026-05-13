import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";
import "@testing-library/jest-dom/vitest";

const secretPath = resolve(process.cwd(), ".secret");
if (existsSync(secretPath)) {
  loadEnv({ path: secretPath, quiet: true });
}

// Intentionally omit NEXT_PUBLIC_CONVEX_URL in tests unless a spec sets it (avoids invalid Convex URLs).
process.env.WORKOS_CLIENT_ID ??= "client_01XXXXXXXXXXXXXXXXXXXXXXXX";
process.env.WORKOS_API_KEY ??= "sk_test_placeholder";
process.env.WORKOS_COOKIE_PASSWORD ??= "01234567890123456789012345678901";
process.env.NEXT_PUBLIC_WORKOS_REDIRECT_URI ??= "http://localhost:3000/callback";
