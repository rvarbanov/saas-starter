import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CREATE_USER_FAILED,
  EMAIL_ALREADY_REGISTERED,
  createWorkOsUser,
  isWorkOsDuplicateEmailError,
  sendWorkOsInvitation,
} from "./workosApi";

describe("isWorkOsDuplicateEmailError", () => {
  it("matches known WorkOS duplicate codes", () => {
    expect(isWorkOsDuplicateEmailError(400, JSON.stringify({ code: "email_not_available" }))).toBe(
      true,
    );
    expect(
      isWorkOsDuplicateEmailError(
        409,
        JSON.stringify({ message: "Email address is already in use." }),
      ),
    ).toBe(true);
  });

  it("ignores unrelated failures", () => {
    expect(isWorkOsDuplicateEmailError(500, "internal")).toBe(false);
    expect(isWorkOsDuplicateEmailError(400, JSON.stringify({ code: "invalid_input" }))).toBe(false);
  });
});

describe("createWorkOsUser", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("posts email and names and returns the WorkOS user id", async () => {
    process.env.WORKOS_API_KEY = "sk_test";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "user_01created" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      createWorkOsUser({ email: "new@example.com", firstName: "Ada", lastName: "Lovelace" }),
    ).resolves.toEqual({ id: "user_01created" });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.workos.com/user_management/users",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          email: "new@example.com",
          first_name: "Ada",
          last_name: "Lovelace",
        }),
      }),
    );
  });

  it("maps duplicate-email responses to Email already registered", async () => {
    process.env.WORKOS_API_KEY = "sk_test";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => JSON.stringify({ code: "email_not_available" }),
      }),
    );

    await expect(createWorkOsUser({ email: "dup@example.com" })).rejects.toThrow(
      EMAIL_ALREADY_REGISTERED,
    );
  });

  it("maps other WorkOS failures to the generic create error", async () => {
    process.env.WORKOS_API_KEY = "sk_test";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => "boom",
      }),
    );

    await expect(createWorkOsUser({ email: "new@example.com" })).rejects.toThrow(
      CREATE_USER_FAILED,
    );
  });
});

describe("sendWorkOsInvitation", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("posts email only with no organization", async () => {
    process.env.WORKOS_API_KEY = "sk_test";
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal("fetch", fetchMock);

    await sendWorkOsInvitation("new@example.com");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.workos.com/user_management/invitations",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: "new@example.com" }),
      }),
    );
  });
});
