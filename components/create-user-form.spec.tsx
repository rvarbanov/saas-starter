import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useAction } from "convex/react";
import { useRouter } from "next/navigation";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CreateUserForm } from "./create-user-form";

vi.mock("@/lib/convex-config", () => ({
  isConvexConfigured: () => true,
}));

vi.mock("convex/react", () => ({
  useAction: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const useActionMock = vi.mocked(useAction);
const useRouterMock = vi.mocked(useRouter);

afterEach(() => {
  cleanup();
});

function renderForm(createUser = vi.fn()) {
  const replace = vi.fn();
  useRouterMock.mockReturnValue({ replace } as unknown as ReturnType<typeof useRouter>);
  useActionMock.mockReturnValue(createUser);
  render(<CreateUserForm />);
  return { createUser, replace };
}

describe("CreateUserForm", () => {
  it("keeps submit disabled until the draft is dirty", () => {
    renderForm();
    expect(screen.getByTestId("create-user-submit")).toBeDisabled();
    fireEvent.change(screen.getByTestId("create-user-email"), {
      target: { value: "ada@example.com" },
    });
    expect(screen.getByTestId("create-user-submit")).not.toBeDisabled();
  });

  it("shows Invalid email address on submit and stays on the form", () => {
    const { createUser } = renderForm();
    fireEvent.change(screen.getByTestId("create-user-email"), {
      target: { value: "not-an-email" },
    });
    fireEvent.submit(screen.getByTestId("create-user-form"));
    expect(screen.getByTestId("create-user-error")).toHaveTextContent("Invalid email address");
    expect(createUser).not.toHaveBeenCalled();
    expect(screen.getByTestId("create-user-page")).toBeInTheDocument();
  });

  it("links Cancel to the Users list", () => {
    renderForm();
    expect(screen.getByTestId("create-user-cancel")).toHaveAttribute("href", "/dashboard/users");
  });

  it("freezes the form and shows Creating… while the action is pending", () => {
    renderForm(vi.fn(() => new Promise(() => {})));
    fireEvent.change(screen.getByTestId("create-user-email"), {
      target: { value: "ada@example.com" },
    });
    fireEvent.submit(screen.getByTestId("create-user-form"));
    expect(screen.getByTestId("create-user-submit")).toHaveTextContent("Creating…");
    expect(screen.getByTestId("create-user-email")).toBeDisabled();
    expect(screen.getByTestId("create-user-first-name")).toBeDisabled();
    expect(screen.getByTestId("create-user-last-name")).toBeDisabled();
    expect(screen.getByTestId("create-user-role-manager")).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByTestId("create-user-role-team_member")).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    expect(screen.getByTestId("create-user-cancel")).toHaveAttribute("aria-disabled", "true");
  });
});
