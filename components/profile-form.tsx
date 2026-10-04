"use client";

import { useAction, useConvexAuth, useQuery } from "convex/react";
import { UserForm } from "@/components/user-form";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { namesForFormInputs } from "@/convex/lib/userNames";
import { APP_ROUTES } from "@/lib/app-routes";
import { isConvexConfigured } from "@/lib/convex-config";
import { formatRoleLabels } from "@/lib/role-labels";

export function ProfileForm() {
  if (!isConvexConfigured()) {
    return (
      <>
        <h1 className="heading-page">Profile</h1>
        <p className="text-caption">Convex is not configured; profile cannot be edited.</p>
      </>
    );
  }

  return <ProfileFormInner />;
}

function ProfileFormInner() {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const ready = !authLoading && isAuthenticated;
  const user = useQuery(api.users.getMe, ready ? {} : "skip");

  if (!ready || user === undefined) {
    return (
      <>
        <h1 className="heading-page">Profile</h1>
        <p className="text-loading" data-testid="profile-loading">
          Loading profile…
        </p>
      </>
    );
  }

  if (user === null) {
    return (
      <>
        <h1 className="heading-page">Profile</h1>
        <p className="text-caption" data-testid="profile-missing">
          Setting up your account…
        </p>
      </>
    );
  }

  return <ProfileFields key={user._id} user={user} />;
}

function ProfileFields({
  user,
}: {
  user: {
    _id: Id<"users">;
    email: string;
    firstName?: string;
    lastName?: string;
    roles: Array<"super_admin" | "manager" | "team_member">;
  };
}) {
  const updateUser = useAction(api.usersActions.updateUser);
  const names = namesForFormInputs(user);

  return (
    <UserForm
      cancelHref={APP_ROUTES.profile}
      email={user.email}
      firstName={names.firstName}
      lastName={names.lastName}
      onSubmit={async (draft) => {
        await updateUser({
          userId: user._id,
          firstName: draft.firstName,
          lastName: draft.lastName,
          email: draft.email,
        });
      }}
      rolesText={formatRoleLabels(user.roles)}
      testIdPrefix="profile"
      title="Profile"
    />
  );
}
