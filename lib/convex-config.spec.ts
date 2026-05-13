import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isConvexConfigured } from "./convex-config";

const envKey = "NEXT_PUBLIC_CONVEX_URL";

describe("isConvexConfigured", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns false when URL is missing", () => {
    vi.stubEnv(envKey, "");
    expect(isConvexConfigured()).toBe(false);
  });

  it("returns false for placeholder URLs", () => {
    vi.stubEnv(envKey, "https://placeholder.convex.cloud");
    expect(isConvexConfigured()).toBe(false);
  });

  it("returns true for a convex.cloud https URL", () => {
    vi.stubEnv(envKey, "https://happy-animal-123.convex.cloud");
    expect(isConvexConfigured()).toBe(true);
  });
});
