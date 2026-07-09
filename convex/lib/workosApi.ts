type WorkOsUserProfile = {
  email: string;
};

/** Fetch email from WorkOS for provisioning. Does not read or return name fields. */
export async function fetchWorkOsUserProfile(workosUserId: string): Promise<WorkOsUserProfile> {
  const apiKey = process.env.WORKOS_API_KEY;
  if (!apiKey) {
    throw new Error(
      "WORKOS_API_KEY is not configured on this Convex deployment. Set it with `npx convex env set WORKOS_API_KEY …` or add `email` to your WorkOS JWT template.",
    );
  }

  const response = await fetch(`https://api.workos.com/user_management/users/${workosUserId}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("WorkOS user profile fetch failed", {
      status: response.status,
      body: errorBody,
      workosUserId,
    });
    throw new Error("Failed to load user profile from WorkOS");
  }

  const data: unknown = await response.json();
  if (typeof data !== "object" || data === null) {
    throw new Error("Invalid WorkOS user profile response");
  }

  const record = data as Record<string, unknown>;
  const email = record.email;
  if (typeof email !== "string" || !email.trim()) {
    throw new Error("WorkOS user has no email");
  }

  return { email };
}
