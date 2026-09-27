"use client";

import { useConvexAuth, useQuery } from "convex/react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { formatListedUserDate } from "@/components/users-list";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { Role } from "@/convex/lib/roles";
import { userDetailLeafLabel } from "@/lib/app-nav";
import { userEditPath } from "@/lib/app-routes";
import { isConvexConfigured } from "@/lib/convex-config";
import { isLikelyUsersId } from "@/lib/convex-id";
import { formatRoleLabels } from "@/lib/role-labels";

type PublicUser = {
  _id: Id<"users">;
  appUserId: string;
  tokenIdentifier: string;
  email: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  workosUserId: string;
  roles: Role[];
  createdAt: number;
  updatedAt: number;
};

export function InviteFailedBanner() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  if (searchParams.get("invite") !== "failed") {
    return null;
  }

  function dismiss() {
    const next = new URLSearchParams(searchParams.toString());
    next.delete("invite");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <div
      className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2"
      data-testid="user-detail-invite-failed-banner"
      role="status"
    >
      <p className="text-body">
        User created, but the invite email could not be sent. You can resend it later.
      </p>
      <Button
        data-testid="user-detail-invite-failed-dismiss"
        onClick={dismiss}
        size="sm"
        type="button"
        variant="outline"
      >
        Dismiss
      </Button>
    </div>
  );
}

export function UserDetail({ userId: rawUserId }: { userId: string }) {
  if (!isConvexConfigured()) {
    return (
      <div className="page-main" data-testid="user-detail-page">
        <p className="text-caption">Convex is not configured; User detail cannot load.</p>
      </div>
    );
  }

  if (!isLikelyUsersId(rawUserId)) {
    return (
      <div className="page-main" data-testid="user-detail-page">
        <h1 className="heading-page">User</h1>
        <p className="text-body" data-testid="user-detail-not-found">
          User not found
        </p>
      </div>
    );
  }

  return <UserDetailInner userId={rawUserId as Id<"users">} />;
}

function UserDetailInner({ userId }: { userId: Id<"users"> }) {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const ready = !authLoading && isAuthenticated;
  const user = useQuery(api.users.getById, ready ? { userId } : "skip");

  if (!ready || user === undefined) {
    return (
      <div className="page-main" data-testid="user-detail-page">
        <p className="text-loading">Loading user…</p>
      </div>
    );
  }

  if (user === null) {
    return (
      <div className="page-main" data-testid="user-detail-page">
        <h1 className="heading-page">User</h1>
        <p className="text-body" data-testid="user-detail-not-found">
          User not found
        </p>
      </div>
    );
  }

  const title = userDetailLeafLabel(user);

  return (
    <div className="page-main" data-testid="user-detail-page">
      <Suspense>
        <InviteFailedBanner />
      </Suspense>
      <div className="mb-4 flex items-start justify-between gap-4">
        <h1 className="heading-page">{title}</h1>
        <Link className={buttonVariants()} href={userEditPath(user._id)}>
          Edit
        </Link>
      </div>
      <UserDetailViewFields user={user} />
    </div>
  );
}

function UserDetailViewFields({ user }: { user: PublicUser }) {
  return (
    <dl className="mt-4 grid gap-3">
      <Field label="First name" value={user.firstName ?? ""} />
      <Field label="Last name" value={user.lastName ?? ""} />
      <Field label="Email" value={user.email} />
      <Field label="Name" value={user.name ?? ""} />
      <Field label="Roles" value={formatRoleLabels(user.roles)} />
      <Field label="App user id" value={user.appUserId} />
      <Field label="Token identifier" value={user.tokenIdentifier} />
      <Field label="WorkOS user id" value={user.workosUserId} />
      <Field label="Convex id" value={user._id} />
      <Field label="Created at" value={formatListedUserDate(user.createdAt)} />
      <Field label="Updated at" value={formatListedUserDate(user.updatedAt)} />
    </dl>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="field-group">
      <dt className="text-label">{label}</dt>
      <dd className="text-value break-all">{value || "—"}</dd>
    </div>
  );
}
