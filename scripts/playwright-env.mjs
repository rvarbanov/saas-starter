import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";

export const DEFAULT_ORIGIN = "http://localhost:3000";

/** Load `.env` then `.secret` (same order as playwright.config.ts). */
export function loadPlaywrightEnv(cwd = process.cwd()) {
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
export function envPositiveInt(name, fallback) {
  const raw = process.env[name]?.trim();
  if (raw === undefined || raw === "") return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/**
 * Canonical Playwright origin.
 * Fallback: PLAYWRIGHT_BASE_URL → NEXT_PUBLIC_APP_URL → http://localhost:3000
 */
export function getCanonicalPlaywrightOrigin() {
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

export function getPlaywrightOriginUrl() {
  try {
    return new URL(getCanonicalPlaywrightOrigin());
  } catch {
    return new URL(DEFAULT_ORIGIN);
  }
}

export function isLocalDevHost(hostname) {
  const h = hostname.toLowerCase();
  return h === "localhost" || h === "127.0.0.1" || h === "::1";
}

/** Host for TCP connect / next dev --hostname (localhost → 127.0.0.1). */
export function devBindHost(hostname) {
  return hostname.toLowerCase() === "localhost" ? "127.0.0.1" : hostname;
}

export function healthCheckUrl(origin = getCanonicalPlaywrightOrigin()) {
  return `${origin}/api/health`;
}
