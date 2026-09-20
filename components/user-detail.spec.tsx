import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { afterEach, describe, expect, it, vi } from "vitest";
import { InviteFailedBanner } from "./user-detail";

vi.mock("next/navigation", () => ({
  useSearchParams: vi.fn(),
  usePathname: vi.fn(),
  useRouter: vi.fn(),
}));

const useSearchParamsMock = vi.mocked(useSearchParams);
const usePathnameMock = vi.mocked(usePathname);
const useRouterMock = vi.mocked(useRouter);

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
