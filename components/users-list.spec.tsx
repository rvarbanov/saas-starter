import { cleanup, render, screen } from "@testing-library/react";
import { useConvexAuth, useQuery } from "convex/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { formatListedUserRoles, usersListErrorMessage } from "./users-list";

vi.mock("@/lib/convex-config", () => ({
  isConvexConfigured: () => true,
}));

vi.mock("convex/react", () => ({
  useConvexAuth: vi.fn(),
  useQuery: vi.fn(),
}));

const useConvexAuthMock = vi.mocked(useConvexAuth);
const useQueryMock = vi.mocked(useQuery);

afterEach(() => {
  cleanup();
});

async function renderUsersList() {
  const { UsersList } = await import("./users-list");
  return render(<UsersList />);
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

describe("formatListedUserRoles", () => {
  it("formats known roles for display", () => {
    expect(formatListedUserRoles(["super_admin", "team_member"])).toBe("Super admin, Team member");
  });
});

describe("UsersList", () => {
  it("renders toolbar, column headers, and empty copy", async () => {
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

    expect(screen.getByTestId("users-directory-toolbar")).toBeInTheDocument();
    expect(screen.getByTestId("users-search-input")).toBeInTheDocument();
    expect(screen.getByTestId("users-directory-table")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "First name" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Last name" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Email" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Roles" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Created at" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Updated at" })).toBeInTheDocument();
    expect(screen.getByText("No users found")).toBeInTheDocument();
  });

  it("renders a listed user row including roles", async () => {
    useConvexAuthMock.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
    } as ReturnType<typeof useConvexAuth>);
    useQueryMock.mockReturnValue({
      page: [
        {
          _id: "users:row1",
          firstName: "Ada",
          lastName: "Lovelace",
          email: "ada@example.com",
          roles: ["manager"],
          createdAt: 1_700_000_000_000,
          updatedAt: 1_700_000_000_000,
        },
      ],
      continueCursor: "",
      isDone: true,
    });

    await renderUsersList();

    const table = screen.getByTestId("users-directory-table");
    expect(table).toHaveTextContent("Ada");
    expect(table).toHaveTextContent("Lovelace");
    expect(table).toHaveTextContent("ada@example.com");
    expect(table).toHaveTextContent("Manager");
  });
});
