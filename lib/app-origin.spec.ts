import { describe, expect, it } from "vitest";
import { appHomeUrl, appOrigin } from "./app-origin";

describe("appOrigin", () => {
  it("uses NEXT_PUBLIC_APP_URL without trailing slash", () => {
    const prev = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000/";
    expect(appOrigin()).toBe("http://localhost:3000");
    process.env.NEXT_PUBLIC_APP_URL = prev;
  });

  it("appHomeUrl appends slash", () => {
    const prev = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    expect(appHomeUrl()).toBe("http://localhost:3000/");
    process.env.NEXT_PUBLIC_APP_URL = prev;
  });
});
