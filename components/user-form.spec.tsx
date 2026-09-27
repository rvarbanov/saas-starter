import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { UserForm } from "./user-form";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    onClick,
    ...props
  }: {
    children: ReactNode;
    href: string;
    onClick?: () => void;
  }) => (
    <a
      href={href}
      onClick={(event) => {
        event.preventDefault();
        onClick?.();
      }}
      {...props}
    >
      {children}
    </a>
  ),
}));

afterEach(() => {
  cleanup();
});

describe("UserForm", () => {
  it("resets a dirty draft when Cancel is clicked", () => {
    render(
      <UserForm
        cancelHref="/dashboard/profile"
        email="ada@example.com"
        firstName="Ada"
        lastName="Lovelace"
        onSubmit={vi.fn()}
        rolesText="None"
        testIdPrefix="profile"
        title="Profile"
      />,
    );

    fireEvent.change(screen.getByTestId("profile-first-name"), {
      target: { value: "Changed" },
    });
    expect(screen.getByTestId("profile-submit")).not.toBeDisabled();
    fireEvent.click(screen.getByTestId("profile-cancel"));
    expect(screen.getByTestId("profile-first-name")).toHaveValue("Ada");
    expect(screen.getByTestId("profile-submit")).toBeDisabled();
    expect(screen.getByTestId("profile-cancel")).toHaveAttribute("href", "/dashboard/profile");
  });
});
