import { describe, expect, it } from "vitest";
import { clampPaginationNumItems, LIST_USERS_MAX_NUM_ITEMS } from "../convex/lib/pagination";

describe("clampPaginationNumItems", () => {
  it("leaves values at or below the cap unchanged", () => {
    expect(clampPaginationNumItems(25)).toBe(25);
    expect(clampPaginationNumItems(LIST_USERS_MAX_NUM_ITEMS)).toBe(LIST_USERS_MAX_NUM_ITEMS);
  });

  it("silently caps values above 100", () => {
    expect(clampPaginationNumItems(101)).toBe(LIST_USERS_MAX_NUM_ITEMS);
    expect(clampPaginationNumItems(10_000)).toBe(LIST_USERS_MAX_NUM_ITEMS);
  });
});
