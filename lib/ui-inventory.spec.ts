import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { APP_UI_INVENTORY } from "./ui-inventory";

const UI_ROOT = join(process.cwd(), "components/ui");

describe("app UI inventory", () => {
  it("keeps the locked shadcn primitives on disk", () => {
    for (const file of APP_UI_INVENTORY) {
      expect(existsSync(join(UI_ROOT, file)), file).toBe(true);
    }
  });

  it("does not replace the existing button primitive", () => {
    expect(existsSync(join(UI_ROOT, "button.tsx"))).toBe(true);
  });
});
