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
    expect(formatListedUserRoles(["SYS_ADM", "USR_VWR"])).toBe("System admin, Users viewer");
  });
});

describe("UsersList", () => {
  it("renders toolbar, column headers, and empty copy", async () => {
    useConvexAuthMock.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
    } as ReturnType<typeof useConvexAuth>);
    useQueryMock.mockImplementation(((...queryArgs: unknown[]) => {
      const args = queryArgs[1];
      if (args && typeof args === "object" && "domain" in args) {
        return true;
      }
      if (args && typeof args === "object" && "paginationOpts" in args) {
        return {
          page: [],
          continueCursor: "",
          isDone: true,
        };
      }
      return { _id: "me", email: "me@example.com", roles: [] };
    }) as never);

    await renderUsersList();

    expect(screen.getByTestId("create-user-entry")).toBeInTheDocument();
    expect(screen.getByTestId("create-user-entry")).toHaveAttribute("href", "/dashboard/users/new");
    expect(screen.getByTestId("users-list-toolbar")).toBeInTheDocument();
    expect(screen.getByTestId("users-search-input")).toBeInTheDocument();
    expect(screen.getByTestId("users-list-table")).toBeInTheDocument();
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
    useQueryMock.mockImplementation(((...queryArgs: unknown[]) => {
      const args = queryArgs[1];
      if (args && typeof args === "object" && "domain" in args) {
        return true;
      }
      if (args && typeof args === "object" && "paginationOpts" in args) {
        return {
          page: [
            {
              _id: "users:row1",
              firstName: "Ada",
              lastName: "Lovelace",
              email: "ada@example.com",
              roles: ["USR_MGR"],
              createdAt: 1_700_000_000_000,
              updatedAt: 1_700_000_000_000,
            },
          ],
          continueCursor: "",
          isDone: true,
        };
      }
      return { _id: "me", email: "me@example.com", roles: [] };
    }) as never);

    await renderUsersList();

    const table = screen.getByTestId("users-list-table");
    expect(table).toHaveTextContent("Ada");
    expect(table).toHaveTextContent("Lovelace");
    expect(table).toHaveTextContent("ada@example.com");
    expect(table).toHaveTextContent("Users manager");
  });

  it("keeps the Create user entry visible while the list is loading", async () => {
    useConvexAuthMock.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
    } as ReturnType<typeof useConvexAuth>);
    useQueryMock.mockImplementation(((...queryArgs: unknown[]) => {
      const args = queryArgs[1];
      if (args && typeof args === "object" && "domain" in args) {
        return true;
      }
      if (args && typeof args === "object" && "paginationOpts" in args) {
        return undefined;
      }
      return { _id: "me", email: "me@example.com", roles: [] };
    }) as never);

    await renderUsersList();

    expect(screen.getByTestId("create-user-entry")).toBeInTheDocument();
  });
});
