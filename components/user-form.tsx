"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { normalizeEmail } from "@/convex/lib/email";
import { MAX_NAME_LENGTH } from "@/convex/lib/userNames";
import { cn } from "@/lib/utils";

export type UserFormDraft = {
  firstName: string;
  lastName: string;
  email: string;
};

type UserFormProps = {
  title: string;
  cancelHref: string;
  testIdPrefix: string;
  firstName: string;
  lastName: string;
  email: string;
  rolesText: string;
  onSubmit: (draft: UserFormDraft) => Promise<void>;
};

function draftsEqual(a: UserFormDraft, b: UserFormDraft): boolean {
  return a.firstName === b.firstName && a.lastName === b.lastName && a.email === b.email;
}

function validateDraft(draft: UserFormDraft): string | null {
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

/** Shared fields for Create User, Edit User, and Profile. */
export function UserForm({
  title,
  cancelHref,
  testIdPrefix,
  firstName,
  lastName,
  email,
  rolesText,
  onSubmit,
}: UserFormProps) {
  const [draft, setDraft] = useState<UserFormDraft>({ firstName, lastName, email });
  const [baseline, setBaseline] = useState<UserFormDraft>({ firstName, lastName, email });
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const dirty = !draftsEqual(draft, baseline);
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;

  useEffect(() => {
    if (dirtyRef.current) {
      return;
    }
    const next = { firstName, lastName, email };
    setDraft(next);
    setBaseline(next);
  }, [firstName, lastName, email]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const clientError = validateDraft(draft);
    if (clientError) {
      setError(clientError);
      return;
    }

    setPending(true);
    try {
      await onSubmit(draft);
      setBaseline(draft);
      setPending(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save user");
      setPending(false);
    }
  }

  function resetDraft() {
    setError(null);
    setDraft(baseline);
  }

  const firstNameId = `${testIdPrefix}-first-name`;
  const lastNameId = `${testIdPrefix}-last-name`;
  const emailId = `${testIdPrefix}-email`;

  return (
    <form className="form" data-testid={`${testIdPrefix}-form`} noValidate onSubmit={handleSubmit}>
      <div className="mb-4 flex items-start justify-between gap-4">
        <h1 className="heading-page">{title}</h1>
        <div className="flex shrink-0 gap-2">
          <Button data-testid={`${testIdPrefix}-submit`} disabled={pending || !dirty} type="submit">
            {pending ? "Saving…" : "Save"}
          </Button>
          <Link
            aria-disabled={pending || undefined}
            className={cn(
              buttonVariants({ variant: "outline" }),
              pending && "pointer-events-none opacity-50",
            )}
            data-testid={`${testIdPrefix}-cancel`}
            href={cancelHref}
            onClick={resetDraft}
            tabIndex={pending ? -1 : undefined}
          >
            Cancel
          </Link>
        </div>
      </div>

      <div className="form-fields">
        <label className="field-label" htmlFor={firstNameId}>
          <span className="text-label">First name</span>
          <Input
            data-testid={firstNameId}
            disabled={pending}
            id={firstNameId}
            onChange={(event) =>
              setDraft((current) => ({ ...current, firstName: event.target.value }))
            }
            value={draft.firstName}
          />
        </label>
        <label className="field-label" htmlFor={lastNameId}>
          <span className="text-label">Last name</span>
          <Input
            data-testid={lastNameId}
            disabled={pending}
            id={lastNameId}
            onChange={(event) =>
              setDraft((current) => ({ ...current, lastName: event.target.value }))
            }
            value={draft.lastName}
          />
        </label>
        <label className="field-label" htmlFor={emailId}>
          <span className="text-label">
            Email
            <span aria-hidden="true"> *</span>
          </span>
          <Input
            aria-required="true"
            data-testid={emailId}
            disabled={pending}
            id={emailId}
            onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))}
            type="email"
            value={draft.email}
          />
        </label>
      </div>

      <div className="field-group mt-4">
        <p className="text-label">Roles</p>
        <p className="text-value" data-testid={`${testIdPrefix}-roles`}>
          {rolesText}
        </p>
      </div>

      {error ? (
        <p className="text-error mt-4" data-testid={`${testIdPrefix}-error`} role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
