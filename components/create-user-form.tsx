"use client";

import { useAction } from "convex/react";
import { useRouter } from "next/navigation";
import { UserForm } from "@/components/user-form";
import { api } from "@/convex/_generated/api";
import { APP_ROUTES, userDetailPath } from "@/lib/app-routes";
import { isConvexConfigured } from "@/lib/convex-config";

export function CreateUserForm() {
  if (!isConvexConfigured()) {
    return (
      <div className="content-area" data-testid="create-user-page">
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

  return (
    <div className="content-area" data-testid="create-user-page">
      <UserForm
        cancelHref={APP_ROUTES.users}
        email=""
        firstName=""
        lastName=""
        onSubmit={async (draft) => {
          const result = await createUser({
            email: draft.email,
            ...(draft.firstName.trim() !== "" ? { firstName: draft.firstName } : {}),
            ...(draft.lastName.trim() !== "" ? { lastName: draft.lastName } : {}),
          });
          const path = userDetailPath(result.user._id);
          router.replace(result.inviteSent ? path : `${path}?invite=failed`);
        }}
        rolesText="None"
        testIdPrefix="create-user"
        title="Create user"
      />
    </div>
  );
}
