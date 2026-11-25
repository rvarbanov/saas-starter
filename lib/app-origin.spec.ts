import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { appHomeUrl, appOrigin, workosRedirectUri } from "./app-origin";

describe("appOrigin", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses NEXT_PUBLIC_APP_URL without trailing slash", () => {
    vi.stubEnv("VERCEL_ENV", "");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000/");
    expect(appOrigin()).toBe("http://localhost:3000");
  });

  it("appHomeUrl appends slash", () => {
    vi.stubEnv("VERCEL_ENV", "");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
    expect(appHomeUrl()).toBe("http://localhost:3000/");
  });

  it("falls back to localhost when nothing is set", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    vi.stubEnv("VERCEL_ENV", "");
    expect(appOrigin()).toBe("http://localhost:3000");
  });

  it("on Preview ignores localhost APP_URL and prefers VERCEL_BRANCH_URL", () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
    vi.stubEnv("VERCEL_BRANCH_URL", "saas-starter-git-feat-radis-projects.vercel.app");
    vi.stubEnv("VERCEL_URL", "saas-starter-abc123-radis-projects.vercel.app");
    expect(appOrigin()).toBe("https://saas-starter-git-feat-radis-projects.vercel.app");
  });

  it("on Preview falls back to VERCEL_URL when BRANCH_URL is missing", () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
    vi.stubEnv("VERCEL_BRANCH_URL", "");
    vi.stubEnv("VERCEL_URL", "saas-starter-abc123-radis-projects.vercel.app");
    expect(appOrigin()).toBe("https://saas-starter-abc123-radis-projects.vercel.app");
  });

  it("on Preview keeps an intentionally set non-localhost APP_URL", () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://preview.example.com");
    vi.stubEnv("VERCEL_BRANCH_URL", "saas-starter-git-feat-radis-projects.vercel.app");
    expect(appOrigin()).toBe("https://preview.example.com");
  });

  it("on Production ignores localhost APP_URL and uses PROJECT_PRODUCTION_URL", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "saas-starter-bay-ten.vercel.app");
    vi.stubEnv("VERCEL_URL", "saas-starter-abc123-radis-projects.vercel.app");
    expect(appOrigin()).toBe("https://saas-starter-bay-ten.vercel.app");
    expect(appHomeUrl()).toBe("https://saas-starter-bay-ten.vercel.app/");
  });
});

describe("workosRedirectUri", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses NEXT_PUBLIC_WORKOS_REDIRECT_URI locally", () => {
    vi.stubEnv("VERCEL_ENV", "");
    vi.stubEnv("NEXT_PUBLIC_WORKOS_REDIRECT_URI", "http://localhost:3000/callback");
    expect(workosRedirectUri()).toBe("http://localhost:3000/callback");
  });

  it("on Preview ignores localhost redirect and derives from branch host", () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("NEXT_PUBLIC_WORKOS_REDIRECT_URI", "http://localhost:3000/callback");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
    vi.stubEnv("VERCEL_BRANCH_URL", "saas-starter-git-feat-radis-projects.vercel.app");
    expect(workosRedirectUri()).toBe(
      "https://saas-starter-git-feat-radis-projects.vercel.app/callback",
    );
  });

  it("keeps an intentionally set production redirect URI", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv(
      "NEXT_PUBLIC_WORKOS_REDIRECT_URI",
      "https://saas-starter-bay-ten.vercel.app/callback",
    );
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "saas-starter-bay-ten.vercel.app");
    expect(workosRedirectUri()).toBe("https://saas-starter-bay-ten.vercel.app/callback");
  });

  it("on Production without redirect env derives from production host", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_WORKOS_REDIRECT_URI", "http://localhost:3000/callback");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "saas-starter-bay-ten.vercel.app");
    expect(workosRedirectUri()).toBe("https://saas-starter-bay-ten.vercel.app/callback");
  });
});
