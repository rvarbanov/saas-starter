"use client";

import { useAction } from "convex/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { api } from "@/convex/_generated/api";
import { normalizeEmail } from "@/convex/lib/email";
import { ASSIGNABLE_ROLES, type AssignableRole } from "@/convex/lib/roles";
import { MAX_NAME_LENGTH } from "@/convex/lib/userNames";
import { APP_ROUTES, userDetailPath } from "@/lib/app-routes";
import { isConvexConfigured } from "@/lib/convex-config";
import { ROLE_LABELS } from "@/lib/role-labels";
import { cn } from "@/lib/utils";

type Draft = {
  firstName: string;
  lastName: string;
  email: string;
  roles: AssignableRole[];
};

const EMPTY_DRAFT: Draft = {
  firstName: "",
  lastName: "",
  email: "",
  roles: [],
};

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

export function CreateUserForm() {
  if (!isConvexConfigured()) {
    return (
      <div className="page-main" data-testid="create-user-page">
        <h1 className="heading-page">Create user</h1>
        <p className="text-caption">Convex is not configured; Create User cannot load.</p>
      </div>
    );
  }

  return <CreateUserFormInner />;
}

function CreateUserFormInner() {
  const createUser = useAction(api.usersActions.createUser);
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const dirty = !draftsEqual(draft, EMPTY_DRAFT);
  const freeze = creating;

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

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const clientError = validateDraft(draft);
    if (clientError) {
      setError(clientError);
      return;
    }

    setCreating(true);
    try {
      const result = await createUser({
        email: draft.email,
        ...(draft.firstName.trim() !== "" ? { firstName: draft.firstName } : {}),
        ...(draft.lastName.trim() !== "" ? { lastName: draft.lastName } : {}),
        ...(draft.roles.length > 0 ? { roles: draft.roles } : {}),
      });
      const path = userDetailPath(result.user._id);
      router.replace(result.inviteSent ? path : `${path}?invite=failed`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create user. Please try again.");
      setCreating(false);
    }
  }

  return (
    <div className="page-main" data-testid="create-user-page">
      <form className="form" data-testid="create-user-form" noValidate onSubmit={handleSubmit}>
        <div className="mb-4 flex items-start justify-between gap-4">
          <h1 className="heading-page">Create user</h1>
          <div className="flex shrink-0 gap-2">
            <Button data-testid="create-user-submit" disabled={freeze || !dirty} type="submit">
              {creating ? "Creating…" : "Create user"}
            </Button>
            <Link
              aria-disabled={freeze || undefined}
              className={cn(
                buttonVariants({ variant: "outline" }),
                freeze && "pointer-events-none opacity-50",
              )}
              data-testid="create-user-cancel"
              href={APP_ROUTES.users}
              tabIndex={freeze ? -1 : undefined}
            >
              Cancel
            </Link>
          </div>
        </div>

        <div className="form-fields">
          <label className="field-label" htmlFor="create-user-first-name">
            <span className="text-label">First name</span>
            <Input
              data-testid="create-user-first-name"
              disabled={freeze}
              id="create-user-first-name"
              onChange={(event) => setDraft((d) => ({ ...d, firstName: event.target.value }))}
              value={draft.firstName}
            />
          </label>
          <label className="field-label" htmlFor="create-user-last-name">
            <span className="text-label">Last name</span>
            <Input
              data-testid="create-user-last-name"
              disabled={freeze}
              id="create-user-last-name"
              onChange={(event) => setDraft((d) => ({ ...d, lastName: event.target.value }))}
              value={draft.lastName}
            />
          </label>
          <label className="field-label" htmlFor="create-user-email">
            <span className="text-label">Email</span>
            <Input
              data-testid="create-user-email"
              disabled={freeze}
              id="create-user-email"
              onChange={(event) => setDraft((d) => ({ ...d, email: event.target.value }))}
              type="email"
              value={draft.email}
            />
          </label>
        </div>

        <div className="field-group mt-4">
          <p className="text-label">Roles</p>
          <div className="flex flex-col gap-2">
            {ASSIGNABLE_ROLES.map((role) => {
              const id = `create-user-role-${role}`;
              return (
                <div className="flex items-center gap-2 text-sm" key={role}>
                  <Checkbox
                    checked={draft.roles.includes(role)}
                    data-testid={id}
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
        </div>

        {error ? (
          <p className="text-error mt-4" data-testid="create-user-error" role="alert">
            {error}
          </p>
        ) : null}
      </form>
    </div>
  );
}
