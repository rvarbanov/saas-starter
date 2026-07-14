import { expect, test } from "@playwright/test";

test.describe("smoke", () => {
  test("home page loads", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /AI-ready SaaS template/i })).toBeVisible();
    await expect(page.getByText(/Copyright © \d{4}/)).toBeVisible();
    const createdBy = page.getByRole("link", { name: /Created by rvarbanov/i });
    await expect(createdBy).toBeVisible();
    await expect(createdBy).toHaveAttribute(
      "href",
      "https://github.com/rvarbanov/saas-starter",
    );
    await expect(createdBy).toHaveAttribute("target", "_blank");
  });
});
