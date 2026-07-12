"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { type FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { namesForFormInputs } from "@/convex/lib/userNames";
import { isConvexConfigured } from "@/lib/convex-config";

type ProfileNameFormProps = {
  /** WorkOS session email shown while Convex user is loading. */
  fallbackEmail?: string | null;
};

type ProfileUser = {
  _id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  name?: string;
};

/** Read-only email + editable first/last name for the signed-in Convex user. */
export function ProfileNameForm({ fallbackEmail }: ProfileNameFormProps) {
  if (!isConvexConfigured()) {
    return (
      <p className="text-sm text-muted-foreground">
        Convex is not configured; profile names cannot be edited.
      </p>
    );
  }

  return <ProfileNameFormInner fallbackEmail={fallbackEmail} />;
}

function ProfileNameFormInner({ fallbackEmail }: ProfileNameFormProps) {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const ready = !authLoading && isAuthenticated;
  const user = useQuery(api.users.getMe, ready ? {} : "skip");

  if (!ready || user === undefined) {
    return (
      <p className="min-h-22 text-sm text-muted-foreground" data-testid="profile-loading">
        Loading profile…
      </p>
    );
  }

  if (user === null) {
    return (
      <p className="text-sm text-muted-foreground" data-testid="profile-missing">
        Setting up your account…
      </p>
    );
  }

  return (
    <ProfileNameFields
      fallbackEmail={fallbackEmail}
      // Remount when the saved Convex names change so inputs show current values.
      key={`${user._id}:${user.firstName ?? ""}:${user.lastName ?? ""}:${user.name ?? ""}`}
      user={user}
    />
  );
}

function ProfileNameFields({
  user,
  fallbackEmail,
}: {
  user: ProfileUser;
  fallbackEmail?: string | null;
}) {
  const updateName = useMutation(api.users.updateName);
  const initial = namesForFormInputs(user);
  const [firstName, setFirstName] = useState(initial.firstName);
  const [lastName, setLastName] = useState(initial.lastName);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const next = namesForFormInputs(user);
    setFirstName(next.firstName);
    setLastName(next.lastName);
  }, [user]);

  const email = user.email || fallbackEmail || "—";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await updateName({ firstName, lastName });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update name");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="flex flex-col gap-6" data-testid="profile-name-form" onSubmit={handleSubmit}>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-foreground">Email</p>
        <p className="text-muted-foreground" data-testid="profile-email">
          {email}
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm" htmlFor="profile-first-name">
          <span className="font-medium text-foreground">First name</span>
          <input
            autoComplete="given-name"
            className="h-9 rounded-lg border border-border bg-background px-3 text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            id="profile-first-name"
            name="firstName"
            onChange={(event) => setFirstName(event.target.value)}
            type="text"
            value={firstName}
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm" htmlFor="profile-last-name">
          <span className="font-medium text-foreground">Last name</span>
          <input
            autoComplete="family-name"
            className="h-9 rounded-lg border border-border bg-background px-3 text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            id="profile-last-name"
            name="lastName"
            onChange={(event) => setLastName(event.target.value)}
            type="text"
            value={lastName}
          />
        </label>
      </div>

      {error ? (
        <p className="text-sm text-destructive" data-testid="profile-name-error" role="alert">
          {error}
        </p>
      ) : null}

      <div>
        <Button disabled={submitting} type="submit">
          {submitting ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}
