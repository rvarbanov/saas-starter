import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { hasProvisionedThisSignIn } from "@/lib/provisioned-sign-in";
import { useStoreUser } from "./use-store-user";

const auth = vi.hoisted(() => ({
  configured: true,
  sessionId: "session-a" as string | undefined,
  workOsLoading: false,
  isAuthenticated: true,
  convexLoading: false,
}));

const storeUser = vi.hoisted(() => vi.fn());

vi.mock("@/lib/convex-config", () => ({
  isConvexConfigured: () => auth.configured,
}));

vi.mock("@workos-inc/authkit-nextjs/components", () => ({
  useAuth: () => ({
    sessionId: auth.sessionId,
    loading: auth.workOsLoading,
  }),
}));

vi.mock("convex/react", () => ({
  useAction: () => storeUser,
  useConvexAuth: () => ({
    isAuthenticated: auth.isAuthenticated,
    isLoading: auth.convexLoading,
  }),
}));

function Harness() {
  useStoreUser();
  return null;
}

describe("useStoreUser", () => {
  beforeEach(() => {
    auth.configured = true;
    auth.sessionId = "session-a";
    auth.workOsLoading = false;
    auth.isAuthenticated = true;
    auth.convexLoading = false;
    storeUser.mockReset();
    storeUser.mockResolvedValue(undefined);
    sessionStorage.clear();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("provisions once and remembers the sign-in after success", async () => {
    render(<Harness />);

    await waitFor(() => {
      expect(storeUser).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(hasProvisionedThisSignIn("session-a")).toBe(true);
    });
  });

  it("skips provisioning on a later load of the same sign-in", async () => {
    const first = render(<Harness />);
    await waitFor(() => {
      expect(storeUser).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(hasProvisionedThisSignIn("session-a")).toBe(true);
    });

    first.unmount();
    render(<Harness />);

    expect(storeUser).toHaveBeenCalledTimes(1);
  });

  it("retries on the next load when provisioning failed", async () => {
    storeUser.mockRejectedValueOnce(new Error("provision failed"));
    const first = render(<Harness />);

    await waitFor(() => {
      expect(storeUser).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(console.error).toHaveBeenCalled();
    });
    expect(hasProvisionedThisSignIn("session-a")).toBe(false);

    first.unmount();
    storeUser.mockResolvedValueOnce(undefined);
    render(<Harness />);

    await waitFor(() => {
      expect(storeUser).toHaveBeenCalledTimes(2);
    });
    await waitFor(() => {
      expect(hasProvisionedThisSignIn("session-a")).toBe(true);
    });
  });

  it("provisions again for a new sign-in", async () => {
    const first = render(<Harness />);
    await waitFor(() => {
      expect(hasProvisionedThisSignIn("session-a")).toBe(true);
    });
    first.unmount();

    auth.sessionId = "session-b";
    render(<Harness />);

    await waitFor(() => {
      expect(storeUser).toHaveBeenCalledTimes(2);
    });
    expect(hasProvisionedThisSignIn("session-b")).toBe(true);
  });

  it("does not provision when signed out", () => {
    auth.isAuthenticated = false;
    render(<Harness />);

    expect(storeUser).not.toHaveBeenCalled();
  });

  it("does not provision when Convex is not configured", () => {
    auth.configured = false;
    render(<Harness />);

    expect(storeUser).not.toHaveBeenCalled();
  });
});
