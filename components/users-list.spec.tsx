import { render, screen } from "@testing-library/react";
import { useConvexAuth, useQuery } from "convex/react";
import { describe, expect, it, vi } from "vitest";
import { usersListErrorMessage } from "./users-list";

vi.mock("@/lib/convex-config", () => ({
  isConvexConfigured: () => true,
}));

vi.mock("convex/react", () => ({
  useConvexAuth: vi.fn(),
  useQuery: vi.fn(),
}));

const useConvexAuthMock = vi.mocked(useConvexAuth);
const useQueryMock = vi.mocked(useQuery);

async function renderUsersList() {
  const { UsersList } = await import("./users-list");
  render(<UsersList />);
}

describe("usersListErrorMessage", () => {
  it("returns the server Error message", () => {
    expect(usersListErrorMessage(new Error("Not authenticated"))).toBe("Not authenticated");
  });

  it("falls back when the error has no message", () => {
    expect(usersListErrorMessage(new Error("   "))).toBe("Something went wrong");
    expect(usersListErrorMessage("nope")).toBe("Something went wrong");
  });
});

describe("UsersList", () => {
  it("renders column headers and empty copy", async () => {
    useConvexAuthMock.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
    } as ReturnType<typeof useConvexAuth>);
    useQueryMock.mockReturnValue({
      page: [],
      continueCursor: "",
      isDone: true,
    });

    await renderUsersList();

    expect(screen.getByTestId("users-directory-table")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "First name" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Last name" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Email" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Created at" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Updated at" })).toBeInTheDocument();
    expect(screen.getByText("No users found")).toBeInTheDocument();
  });
});
