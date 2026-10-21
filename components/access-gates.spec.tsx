import { cleanup, render, screen } from "@testing-library/react";
import { useConvexAuth, useQuery } from "convex/react";
import { usePathname } from "next/navigation";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { UsersAccessGate } from "@/components/users-access-gate";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
}));

vi.mock("@/lib/convex-config", () => ({
  isConvexConfigured: () => true,
}));

vi.mock("convex/react", () => ({
  useConvexAuth: vi.fn(),
  useQuery: vi.fn(),
}));

const usePathnameMock = vi.mocked(usePathname);
const useConvexAuthMock = vi.mocked(useConvexAuth);
const useQueryMock = vi.mocked(useQuery);

function mockSignedIn(
  can: boolean | undefined,
  me: { _id: string } | null | undefined = { _id: "me" },
) {
  useConvexAuthMock.mockReturnValue({
    isAuthenticated: true,
    isLoading: false,
  } as ReturnType<typeof useConvexAuth>);
  useQueryMock.mockImplementation(((...queryArgs: unknown[]) => {
    const args = queryArgs[1];
    if (args === "skip") {
      return undefined;
    }
    if (args && typeof args === "object" && "domain" in args) {
      return can;
    }
    return me;
  }) as never);
}

afterEach(() => {
  cleanup();
});

describe("UsersAccessGate", () => {
  it("shows a skeleton while can is pending and does not render the page", () => {
    usePathnameMock.mockReturnValue("/dashboard/users");
    mockSignedIn(undefined);
    render(
      <UsersAccessGate>
        <p>Users body</p>
      </UsersAccessGate>,
    );
    expect(screen.getByTestId("users-access-pending")).toBeInTheDocument();
    expect(screen.queryByText("Users body")).not.toBeInTheDocument();
    expect(screen.queryByTestId("unauthorized-empty")).not.toBeInTheDocument();
  });

  it("shows the Unauthorized empty state and keeps the children unmounted", () => {
    usePathnameMock.mockReturnValue("/dashboard/users/new");
    mockSignedIn(false);
    render(
      <UsersAccessGate>
        <p>Create body</p>
      </UsersAccessGate>,
    );
    const empty = screen.getByTestId("unauthorized-empty");
    expect(empty).toHaveTextContent("Unauthorized");
    expect(empty).toHaveTextContent("You do not have access to this page.");
    expect(screen.queryByText("Create body")).not.toBeInTheDocument();
  });

  it("renders the page when the route Action is allowed", () => {
    usePathnameMock.mockReturnValue("/dashboard/users/user_1");
    mockSignedIn(true);
    render(
      <UsersAccessGate>
        <p>Detail body</p>
      </UsersAccessGate>,
    );
    expect(screen.getByText("Detail body")).toBeInTheDocument();
  });
});

describe("AppSidebar Users nav", () => {
  it("omits Users when list is denied and shows a skeleton while pending", () => {
    usePathnameMock.mockReturnValue("/dashboard");
    mockSignedIn(false);
    render(
      <SidebarProvider>
        <AppSidebar />
      </SidebarProvider>,
    );
    expect(screen.queryByText("Users")).not.toBeInTheDocument();
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Coming soon")).toBeInTheDocument();

    cleanup();
    mockSignedIn(undefined);
    render(
      <SidebarProvider>
        <AppSidebar />
      </SidebarProvider>,
    );
    expect(screen.getByTestId("users-nav-pending")).toBeInTheDocument();
    expect(screen.queryByText("Users")).not.toBeInTheDocument();
  });
});
