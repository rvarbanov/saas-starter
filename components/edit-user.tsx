"use client";

import { useAction, useConvexAuth, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { UserForm } from "@/components/user-form";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { namesForFormInputs } from "@/convex/lib/userNames";
import { userDetailPath } from "@/lib/app-routes";
import { isConvexConfigured } from "@/lib/convex-config";
import { isLikelyUsersId } from "@/lib/convex-id";
import { formatRoleLabels } from "@/lib/role-labels";

export function EditUser({ userId: rawUserId }: { userId: string }) {
  if (!isConvexConfigured()) {
    return (
      <div className="page-main" data-testid="edit-user-page">
        <p className="text-caption">Convex is not configured; Edit User cannot load.</p>
      </div>
    );
  }

  if (!isLikelyUsersId(rawUserId)) {
    return <EditUserNotFound />;
  }

  return <EditUserInner userId={rawUserId as Id<"users">} />;
}

function EditUserNotFound() {
  return (
    <div className="page-main" data-testid="edit-user-page">
      <h1 className="heading-page">User</h1>
      <p className="text-body" data-testid="edit-user-not-found">
        User not found
      </p>
    </div>
  );
}

function EditUserInner({ userId }: { userId: Id<"users"> }) {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const ready = !authLoading && isAuthenticated;
  const user = useQuery(api.users.getById, ready ? { userId } : "skip");

  if (!ready || user === undefined) {
    return (
      <div className="page-main" data-testid="edit-user-page">
        <p className="text-loading">Loading user…</p>
      </div>
    );
  }

  if (user === null) {
    return <EditUserNotFound />;
  }

  return <EditUserForm key={user._id} user={user} />;
}

function EditUserForm({
  user,
}: {
  user: {
    _id: Id<"users">;
    email: string;
    firstName?: string;
    lastName?: string;
    name?: string;
    roles: Array<"super_admin" | "manager" | "team_member">;
  };
}) {
  const updateUser = useAction(api.usersActions.updateUser);
  const router = useRouter();
  const names = namesForFormInputs(user);

  return (
    <div className="page-main" data-testid="edit-user-page">
      <UserForm
        cancelHref={userDetailPath(user._id)}
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
          router.replace(userDetailPath(user._id));
        }}
        rolesText={formatRoleLabels(user.roles)}
        testIdPrefix="edit-user"
        title="Edit user"
      />
    </div>
  );
}
