import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useConvexAuth, usePaginatedQuery, useQuery } from "convex/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { afterEach, describe, expect, it, vi } from "vitest";
import { InviteFailedBanner, UserDetail } from "./user-detail";

vi.mock("next/navigation", () => ({
  useSearchParams: vi.fn(),
  usePathname: vi.fn(),
  useRouter: vi.fn(),
}));

vi.mock("@/lib/convex-config", () => ({
  isConvexConfigured: () => true,
}));

vi.mock("convex/react", () => ({
  useConvexAuth: vi.fn(),
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  usePaginatedQuery: vi.fn(),
}));

const useSearchParamsMock = vi.mocked(useSearchParams);
const usePathnameMock = vi.mocked(usePathname);
const useRouterMock = vi.mocked(useRouter);
const useConvexAuthMock = vi.mocked(useConvexAuth);
const useQueryMock = vi.mocked(useQuery);
const usePaginatedQueryMock = vi.mocked(usePaginatedQuery);

const userId = "user_detail_1";

function mockNavigation() {
  useSearchParamsMock.mockReturnValue(
    new URLSearchParams() as unknown as ReturnType<typeof useSearchParams>,
  );
  usePathnameMock.mockReturnValue(`/dashboard/users/${userId}`);
  useRouterMock.mockReturnValue({ replace: vi.fn() } as unknown as ReturnType<typeof useRouter>);
}

const loadedUser = {
  _id: userId,
  appUserId: "app-1",
  tokenIdentifier: "https://example.test|ada",
  email: "ada@example.com",
  firstName: "Ada",
  lastName: "Lovelace",
  workosUserId: "user_01ada",
  roles: [],
  createdAt: 1,
  updatedAt: 2,
};

function queryResult(user: typeof loadedUser | null) {
  return (_reference: unknown, args?: unknown) => {
    if (args === "skip" || args === undefined) {
      return undefined;
    }
    if (typeof args === "object" && args !== null && "userId" in args) {
      return user;
    }
    return null;
  };
}

function mockLoadedUser() {
  useConvexAuthMock.mockReturnValue({
    isAuthenticated: true,
    isLoading: false,
  } as ReturnType<typeof useConvexAuth>);
  useQueryMock.mockImplementation(queryResult(loadedUser) as never);
}

afterEach(() => {
  cleanup();
});

describe("InviteFailedBanner", () => {
  it("renders nothing without invite=failed", () => {
    useSearchParamsMock.mockReturnValue(
      new URLSearchParams() as unknown as ReturnType<typeof useSearchParams>,
    );
    usePathnameMock.mockReturnValue("/dashboard/users/abc");
    useRouterMock.mockReturnValue({ replace: vi.fn() } as unknown as ReturnType<typeof useRouter>);

    const { container } = render(<InviteFailedBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the banner and dismiss removes invite from the URL", () => {
    const replace = vi.fn();
    useSearchParamsMock.mockReturnValue(
      new URLSearchParams("invite=failed") as unknown as ReturnType<typeof useSearchParams>,
    );
    usePathnameMock.mockReturnValue("/dashboard/users/abc");
    useRouterMock.mockReturnValue({ replace } as unknown as ReturnType<typeof useRouter>);

    render(<InviteFailedBanner />);
    expect(screen.getByTestId("user-detail-invite-failed-banner")).toHaveTextContent(
      "User created, but the invite email could not be sent. You can resend it later.",
    );

    fireEvent.click(screen.getByTestId("user-detail-invite-failed-dismiss"));
    expect(replace).toHaveBeenCalledWith("/dashboard/users/abc");
  });
});

describe("User detail Changes", () => {
  it("does not query Changes when the App user is missing", () => {
    mockNavigation();
    useConvexAuthMock.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
    } as ReturnType<typeof useConvexAuth>);
    useQueryMock.mockImplementation(queryResult(null) as never);
    usePaginatedQueryMock.mockReturnValue({
      results: [],
      status: "Exhausted",
      isLoading: false,
      loadMore: vi.fn(),
    } as unknown as ReturnType<typeof usePaginatedQuery>);

    render(<UserDetail userId={userId} />);

    expect(screen.getByTestId("user-detail-not-found")).toHaveTextContent("User not found");
    expect(screen.queryByTestId("user-detail-changes")).not.toBeInTheDocument();
    expect(usePaginatedQueryMock).not.toHaveBeenCalled();
  });

  it("shows an empty Changes list without Load older", () => {
    mockNavigation();
    mockLoadedUser();
    usePaginatedQueryMock.mockReturnValue({
      results: [],
      status: "Exhausted",
      isLoading: false,
      loadMore: vi.fn(),
    } as unknown as ReturnType<typeof usePaginatedQuery>);

    render(<UserDetail userId={userId} />);

    expect(screen.getByRole("heading", { name: "Changes" })).toBeInTheDocument();
    expect(screen.getByTestId("user-detail-changes-empty")).toHaveTextContent("No changes yet");
    expect(screen.queryByTestId("user-detail-changes-load-older")).not.toBeInTheDocument();
    expect(usePaginatedQueryMock).toHaveBeenCalledWith(
      expect.anything(),
      { userId },
      {
        initialNumItems: 20,
      },
    );
  });

  it("shows an update row and asks for the next page", () => {
    mockNavigation();
    mockLoadedUser();
    const loadMore = vi.fn();
    usePaginatedQueryMock.mockReturnValue({
      results: [
        {
          _id: "changes:1",
          action: "update",
          at: Date.UTC(2026, 0, 2, 15, 4),
          actorLabel: "Mina Manager",
          fields: [{ label: "First name", before: "Ada", after: "Augusta" }],
        },
      ],
      status: "CanLoadMore",
      loadMore,
    } as unknown as ReturnType<typeof usePaginatedQuery>);

    render(<UserDetail userId={userId} />);

    const row = screen.getByTestId("user-detail-change");
    expect(row).toHaveTextContent("Update");
    expect(row).toHaveTextContent("Mina Manager");
    expect(row).toHaveTextContent("First name Ada → Augusta");
    fireEvent.click(screen.getByTestId("user-detail-changes-load-older"));
    expect(loadMore).toHaveBeenCalledWith(20);
  });

  it("omits the field list on a create row", () => {
    mockNavigation();
    mockLoadedUser();
    usePaginatedQueryMock.mockReturnValue({
      results: [
        {
          _id: "changes:2",
          action: "create",
          at: Date.UTC(2026, 0, 2, 15, 4),
          actorLabel: "Mina Manager",
          fields: [],
        },
      ],
      status: "Exhausted",
      loadMore: vi.fn(),
    } as unknown as ReturnType<typeof usePaginatedQuery>);

    render(<UserDetail userId={userId} />);

    const row = screen.getByTestId("user-detail-change");
    expect(row).toHaveTextContent("Create");
    expect(row).toHaveTextContent("Mina Manager");
    expect(row).not.toHaveTextContent("Email");
    expect(screen.queryByTestId("user-detail-changes-load-older")).not.toBeInTheDocument();
  });
});
