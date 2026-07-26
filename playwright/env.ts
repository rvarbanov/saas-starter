import { existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";

export const DEFAULT_ORIGIN = "http://localhost:3000";

export const AUTH_STORAGE_PATH = "playwright/.auth/user.json";

/** Load `.env` then `.secret` (same order as playwright.config.ts). */
export function loadPlaywrightEnv(cwd = process.cwd()): void {
  const envPath = resolve(cwd, ".env");
  const secretPath = resolve(cwd, ".secret");
  if (existsSync(envPath)) {
    loadEnv({ path: envPath, quiet: true });
  }
  if (existsSync(secretPath)) {
    loadEnv({ path: secretPath, quiet: true, override: true });
  }
}

/** Positive integer from env, or fallback when missing / invalid / non-positive. */
export function envPositiveInt(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (raw === undefined || raw === "") return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/**
 * Canonical Playwright origin.
 * Fallback: PLAYWRIGHT_BASE_URL → NEXT_PUBLIC_APP_URL → http://localhost:3000
 */
export function getCanonicalPlaywrightOrigin(): string {
  const playwrightBase = process.env.PLAYWRIGHT_BASE_URL?.trim();
  if (playwrightBase) {
    try {
      return new URL(playwrightBase).origin;
    } catch {
      /* fall through */
    }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (appUrl) {
    try {
      return new URL(appUrl).origin;
    } catch {
      /* fall through */
    }
  }

  return DEFAULT_ORIGIN;
}

export function getPlaywrightOriginUrl(): URL {
  try {
    return new URL(getCanonicalPlaywrightOrigin());
  } catch {
    return new URL(DEFAULT_ORIGIN);
  }
}

export function isLocalDevHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h === "localhost" || h === "127.0.0.1" || h === "::1";
}

/** Host for `next dev --hostname` (localhost → 127.0.0.1). */
export function devBindHost(hostname: string): string {
  return hostname.toLowerCase() === "localhost" ? "127.0.0.1" : hostname;
}

export function parseOriginForDevServer(origin = getCanonicalPlaywrightOrigin()): {
  port: number;
  bindHost: string;
} {
  const originUrl = (() => {
    try {
      return new URL(origin);
    } catch {
      return new URL(DEFAULT_ORIGIN);
    }
  })();
  const port =
    originUrl.port !== ""
      ? Number.parseInt(originUrl.port, 10)
      : originUrl.protocol === "https:"
        ? 443
        : 80;
  return {
    port,
    bindHost: devBindHost(originUrl.hostname),
  };
}

export function healthCheckUrl(origin = getCanonicalPlaywrightOrigin()): string {
  return `${origin}/api/health`;
}

/** Env vars required for authenticated Playwright (local `.secret`, Cursor Cloud, or CI secrets). */
export const REQUIRED_WORKOS_E2E_ENV = [
  "E2E_WORKOS_EMAIL",
  "E2E_WORKOS_PASSWORD",
  "WORKOS_API_KEY",
  "WORKOS_COOKIE_PASSWORD",
] as const;

export function missingWorkOsE2eEnv(): string[] {
  return REQUIRED_WORKOS_E2E_ENV.filter((name) => !process.env[name]?.trim());
}

export function hasWorkOsE2eCreds(): boolean {
  return missingWorkOsE2eEnv().length === 0;
}

/**
 * Fail fast when authenticated e2e secrets are missing.
 * Same gate for local, Cursor Cloud, and GitHub Actions.
 */
export function requireWorkOsE2eEnv(): void {
  const missing = missingWorkOsE2eEnv();
  if (missing.length === 0) return;

  const where =
    "Set them in `.secret` (local), Cursor Cloud environment secrets, or GitHub Actions secrets (wired in `.github/workflows/ci.yml`).";
  throw new Error(
    `Playwright e2e requires WorkOS secrets. Missing: ${missing.join(", ")}. ${where}`,
  );
}

/** Ensure directory for auth storageState exists before setup writes the file. */
export function ensureAuthStorageDir(cwd = process.cwd()): void {
  mkdirSync(resolve(cwd, "playwright", ".auth"), { recursive: true });
}
