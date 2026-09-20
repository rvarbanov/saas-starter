"use client";

import { useAction, useConvexAuth, useQuery } from "convex/react";
import { type FormEvent, Suspense, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { formatListedUserDate } from "@/components/users-list";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { normalizeEmail } from "@/convex/lib/email";
import { ASSIGNABLE_ROLES, type AssignableRole, type Role } from "@/convex/lib/roles";
import { MAX_NAME_LENGTH, namesForFormInputs } from "@/convex/lib/userNames";
import { userDetailLeafLabel } from "@/lib/app-nav";
import { isConvexConfigured } from "@/lib/convex-config";
import { isLikelyUsersId } from "@/lib/convex-id";
import { formatRoleLabels, ROLE_LABELS } from "@/lib/role-labels";

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

type Draft = {
  firstName: string;
  lastName: string;
  email: string;
  roles: AssignableRole[];
};

function assignableFromRoles(roles: readonly Role[]): AssignableRole[] {
  return roles.filter((role): role is AssignableRole =>
    ASSIGNABLE_ROLES.includes(role as AssignableRole),
  );
}

function draftFromUser(user: PublicUser): Draft {
  const names = namesForFormInputs(user);
  return {
    firstName: names.firstName,
    lastName: names.lastName,
    email: user.email,
    roles: assignableFromRoles(user.roles),
  };
}

function draftsEqual(a: Draft, b: Draft): boolean {
  if (a.firstName !== b.firstName || a.lastName !== b.lastName || a.email !== b.email) {
    return false;
  }
  if (a.roles.length !== b.roles.length) {
    return false;
  }
  const set = new Set(a.roles);
  return b.roles.every((role) => set.has(role));
}

function validateDraft(draft: Draft): string | null {
  if (draft.firstName.trim().length > MAX_NAME_LENGTH) {
    return `First name must be at most ${MAX_NAME_LENGTH} characters`;
  }
  if (draft.lastName.trim().length > MAX_NAME_LENGTH) {
    return `Last name must be at most ${MAX_NAME_LENGTH} characters`;
  }
  const email = draft.email.trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email))) {
    return "Invalid email address";
  }
  return null;
}

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
  const me = useQuery(api.users.getMe, ready ? {} : "skip");
  const user = useQuery(api.users.getById, ready ? { userId } : "skip");

  if (!ready || user === undefined || me === undefined) {
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

  const isOwnDetail = me !== null && me._id === user._id;

  return <UserDetailEditor isOwnDetail={isOwnDetail} key={user._id} user={user} />;
}

function UserDetailEditor({ user, isOwnDetail }: { user: PublicUser; isOwnDetail: boolean }) {
  const updateUserDetail = useAction(api.usersActions.updateUserDetail);
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [draft, setDraft] = useState<Draft>(() => draftFromUser(user));
  const [baseline, setBaseline] = useState<Draft>(() => draftFromUser(user));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const dirty = !draftsEqual(draft, baseline);
  const dirtyRef = useRef(dirty);
  dirtyRef.current = mode === "edit" && dirty;

  // Live query updates apply when viewing, or when edit drafts are not dirty.
  useEffect(() => {
    if (dirtyRef.current) {
      return;
    }
    const next = draftFromUser(user);
    setBaseline(next);
    setDraft(next);
  }, [user]);

  const title = userDetailLeafLabel(user);

  function enterEdit() {
    setError(null);
    const next = draftFromUser(user);
    setBaseline(next);
    setDraft(next);
    setMode("edit");
  }

  function cancelEdit() {
    setError(null);
    setDraft(baseline);
    setMode("view");
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const clientError = validateDraft(draft);
    if (clientError) {
      setError(clientError);
      return;
    }

    setSaving(true);
    try {
      const rolesPayload: Role[] = isOwnDetail ? assignableFromRoles(user.roles) : draft.roles;
      await updateUserDetail({
        userId: user._id,
        firstName: draft.firstName,
        lastName: draft.lastName,
        email: draft.email,
        roles: rolesPayload,
      });
      setMode("view");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save user");
    } finally {
      setSaving(false);
    }
  }

  function toggleRole(role: AssignableRole, checked: boolean) {
    setDraft((current) => {
      const next = new Set(current.roles);
      if (checked) {
        next.add(role);
      } else {
        next.delete(role);
      }
      return { ...current, roles: ASSIGNABLE_ROLES.filter((r) => next.has(r)) };
    });
  }

  if (mode === "view") {
    return (
      <div className="page-main" data-testid="user-detail-page">
        <Suspense>
          <InviteFailedBanner />
        </Suspense>
        <div className="mb-4 flex items-start justify-between gap-4">
          <h1 className="heading-page">{title}</h1>
          <Button onClick={enterEdit} type="button">
            Edit
          </Button>
        </div>
        <UserDetailViewFields user={user} />
      </div>
    );
  }

  const freeze = saving;

  return (
    <div className="page-main" data-testid="user-detail-page">
      <Suspense>
        <InviteFailedBanner />
      </Suspense>
      <form className="form" data-testid="user-detail-form" onSubmit={handleSave}>
        <div className="mb-4 flex items-start justify-between gap-4">
          <h1 className="heading-page">{title}</h1>
          <div className="flex shrink-0 gap-2">
            <Button disabled={freeze || !dirty} type="submit">
              {saving ? "Saving…" : "Save"}
            </Button>
            <Button disabled={freeze} onClick={cancelEdit} type="button" variant="outline">
              Cancel
            </Button>
          </div>
        </div>

        <div className="form-fields">
          <label className="field-label" htmlFor="user-detail-first-name">
            <span className="text-label">First name</span>
            <Input
              disabled={freeze}
              id="user-detail-first-name"
              onChange={(event) => setDraft((d) => ({ ...d, firstName: event.target.value }))}
              value={draft.firstName}
            />
          </label>
          <label className="field-label" htmlFor="user-detail-last-name">
            <span className="text-label">Last name</span>
            <Input
              disabled={freeze}
              id="user-detail-last-name"
              onChange={(event) => setDraft((d) => ({ ...d, lastName: event.target.value }))}
              value={draft.lastName}
            />
          </label>
          <label className="field-label" htmlFor="user-detail-email">
            <span className="text-label">Email</span>
            <Input
              disabled={freeze}
              id="user-detail-email"
              onChange={(event) => setDraft((d) => ({ ...d, email: event.target.value }))}
              type="email"
              value={draft.email}
            />
          </label>
        </div>

        <div className="field-group mt-4">
          <p className="text-label">Roles</p>
          {isOwnDetail ? (
            <p className="text-value">{formatRoleLabels(user.roles)}</p>
          ) : (
            <div className="flex flex-col gap-2">
              {ASSIGNABLE_ROLES.map((role) => {
                const id = `user-detail-role-${role}`;
                return (
                  <div className="flex items-center gap-2 text-sm" key={role}>
                    <Checkbox
                      checked={draft.roles.includes(role)}
                      disabled={freeze}
                      id={id}
                      onCheckedChange={(checked) => toggleRole(role, checked === true)}
                    />
                    <label className="cursor-pointer" htmlFor={id}>
                      {ROLE_LABELS[role]}
                    </label>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <UserDetailReadOnlyMeta user={user} />

        {error ? (
          <p className="text-error mt-4" data-testid="user-detail-error" role="alert">
            {error}
          </p>
        ) : null}
      </form>
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

function UserDetailReadOnlyMeta({ user }: { user: PublicUser }) {
  return (
    <dl className="mt-6 grid gap-3 border-t pt-4">
      <Field label="Name" value={user.name ?? ""} />
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
