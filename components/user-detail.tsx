"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { formatListedUserDate } from "@/components/users-list";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { isSuperAdmin, type Role } from "@/convex/lib/roles";
import { userDetailLeafLabel } from "@/lib/app-nav";
import { APP_ROUTES, userEditPath } from "@/lib/app-routes";
import { isConvexConfigured } from "@/lib/convex-config";
import { isLikelyUsersId } from "@/lib/convex-id";
import { formatRoleLabels } from "@/lib/role-labels";

const DELETE_USER_DIALOG_COPY =
  "You’re about to delete this user. Are you sure you want to do that?";

type PublicUser = {
  _id: Id<"users">;
  appUserId: string;
  tokenIdentifier: string;
  email: string;
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
      <div className="content-area" data-testid="user-detail-page">
        <p className="text-caption">Convex is not configured; User detail cannot load.</p>
      </div>
    );
  }

  if (!isLikelyUsersId(rawUserId)) {
    return (
      <div className="content-area" data-testid="user-detail-page">
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
  const me = useQuery(api.users.getMe, ready ? {} : "skip");

  if (!ready || user === undefined) {
    return (
      <div className="content-area" data-testid="user-detail-page">
        <p className="text-loading">Loading user…</p>
      </div>
    );
  }

  if (user === null) {
    return (
      <div className="content-area" data-testid="user-detail-page">
        <h1 className="heading-page">User</h1>
        <p className="text-body" data-testid="user-detail-not-found">
          User not found
        </p>
      </div>
    );
  }

  const title = userDetailLeafLabel(user);

  return (
    <div className="content-area" data-testid="user-detail-page">
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
      {me != null && isSuperAdmin(me.roles) && me._id !== user._id ? (
        <DeleteUserControl userId={user._id} />
      ) : null}
    </div>
  );
}

function DeleteUserControl({ userId }: { userId: Id<"users"> }) {
  const router = useRouter();
  const deleteUser = useMutation(api.users.deleteUser);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleOpenChange(next: boolean, eventDetails: { cancel: () => void }) {
    if (!next && pending) {
      eventDetails.cancel();
      return;
    }
    if (!next) {
      setError(null);
    }
    setOpen(next);
  }

  async function confirmDelete() {
    setError(null);
    setPending(true);
    try {
      await deleteUser({ userId });
      router.replace(APP_ROUTES.users);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete user");
      setPending(false);
    }
  }

  return (
    <div className="mt-8">
      <AlertDialog onOpenChange={handleOpenChange} open={open}>
        <AlertDialogTrigger
          data-testid="user-detail-delete"
          render={<Button type="button" variant="destructive" />}
        >
          Delete
        </AlertDialogTrigger>
        <AlertDialogContent data-testid="user-detail-delete-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>{DELETE_USER_DIALOG_COPY}</AlertDialogTitle>
          </AlertDialogHeader>
          {error !== null ? (
            <p data-testid="user-detail-delete-error" role="alert">
              {error}
            </p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="user-detail-delete-cancel" disabled={pending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              data-testid="user-detail-delete-confirm"
              disabled={pending}
              onClick={() => {
                void confirmDelete();
              }}
              type="button"
              variant="destructive"
            >
              {pending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function UserDetailViewFields({ user }: { user: PublicUser }) {
  return (
    <dl className="mt-4 grid gap-3">
      <Field label="First name" value={user.firstName ?? ""} />
      <Field label="Last name" value={user.lastName ?? ""} />
      <Field label="Email" value={user.email} />
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
