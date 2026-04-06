import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import { ExternalLinkButton } from "./external-link-button";

describe("ExternalLinkButton", () => {
  it("renders a link with the given href and label", () => {
    render(
      <ExternalLinkButton href="https://example.com" rel="noopener noreferrer" target="_blank">
        Example
      </ExternalLinkButton>,
    );

    // Button + Link uses `asChild`; the anchor keeps `role="button"` from the Button primitive.
    const link = screen.getByRole("button", { name: "Example" });
    expect(link).toHaveAttribute("href", "https://example.com");
    expect(link).toHaveAttribute("target", "_blank");
  });
});
