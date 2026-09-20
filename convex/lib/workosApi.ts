type WorkOsUserProfile = {
  email: string;
};

export type CreatedWorkOsUser = {
  id: string;
};

const WORKOS_USER_MANAGEMENT = "https://api.workos.com/user_management";

export const CREATE_USER_FAILED = "Failed to create user. Please try again.";
export const EMAIL_ALREADY_REGISTERED = "Email already registered";

function requireWorkOsApiKey(): string {
  const apiKey = process.env.WORKOS_API_KEY;
  if (!apiKey) {
    throw new Error(
      "WORKOS_API_KEY is not configured on this Convex deployment. Set it with `npx convex env set WORKOS_API_KEY …` or add `email` to your WorkOS JWT template.",
    );
  }
  return apiKey;
}

/** True when a WorkOS error body indicates the email is already taken. */
export function isWorkOsDuplicateEmailError(status: number, body: string): boolean {
  if (status !== 400 && status !== 409 && status !== 422) {
    return false;
  }

  const trimmed = body.trim();
  if (!trimmed) {
    return false;
  }

  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (typeof parsed === "object" && parsed !== null) {
      const record = parsed as Record<string, unknown>;
      const code = typeof record.code === "string" ? record.code.toLowerCase() : "";
      if (
        code === "email_not_available" ||
        code === "user_already_exists" ||
        code === "email_already_exists"
      ) {
        return true;
      }
      const message = typeof record.message === "string" ? record.message.toLowerCase() : "";
      if (message.includes("already") && (message.includes("email") || message.includes("use"))) {
        return true;
      }
    }
  } catch {
    // Fall through to raw-body matching.
  }

  const lower = trimmed.toLowerCase();
  return lower.includes("already") && (lower.includes("email") || lower.includes("in use"));
}

function asRecord(data: unknown): Record<string, unknown> {
  if (typeof data !== "object" || data === null) {
    throw new Error("Invalid WorkOS response");
  }
  return data as Record<string, unknown>;
}

/** Fetch email from WorkOS for provisioning. Does not read or return name fields. */
export async function fetchWorkOsUserProfile(workosUserId: string): Promise<WorkOsUserProfile> {
  const apiKey = requireWorkOsApiKey();

  const response = await fetch(`${WORKOS_USER_MANAGEMENT}/users/${workosUserId}`, {
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

  const record = asRecord(await response.json());
  const email = record.email;
  if (typeof email !== "string" || !email.trim()) {
    throw new Error("WorkOS user has no email");
  }

  return { email };
}

/**
 * Create an Auth user (email ± names, no password). Does not send an invite.
 * Duplicate emails throw {@link EMAIL_ALREADY_REGISTERED}.
 */
export async function createWorkOsUser(args: {
  email: string;
  firstName?: string;
  lastName?: string;
}): Promise<CreatedWorkOsUser> {
  const apiKey = requireWorkOsApiKey();

  const body: Record<string, string> = { email: args.email };
  if (args.firstName !== undefined && args.firstName !== "") {
    body.first_name = args.firstName;
  }
  if (args.lastName !== undefined && args.lastName !== "") {
    body.last_name = args.lastName;
  }

  const response = await fetch(`${WORKOS_USER_MANAGEMENT}/users`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("WorkOS create user failed", {
      status: response.status,
      body: errorBody,
      email: args.email,
    });
    if (isWorkOsDuplicateEmailError(response.status, errorBody)) {
      throw new Error(EMAIL_ALREADY_REGISTERED);
    }
    throw new Error(CREATE_USER_FAILED);
  }

  const record = asRecord(await response.json());
  const id = record.id;
  if (typeof id !== "string" || !id.trim()) {
    throw new Error(CREATE_USER_FAILED);
  }

  return { id };
}

/** Send WorkOS's default application-wide invite email (no organization). */
export async function sendWorkOsInvitation(email: string): Promise<void> {
  const apiKey = requireWorkOsApiKey();

  const response = await fetch(`${WORKOS_USER_MANAGEMENT}/invitations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("WorkOS send invitation failed", {
      status: response.status,
      body: errorBody,
      email,
    });
    throw new Error("Failed to send WorkOS invitation");
  }
}

/** Delete an Auth user. Used only to roll back Create after a Convex insert failure. */
export async function deleteWorkOsUser(workosUserId: string): Promise<void> {
  const apiKey = requireWorkOsApiKey();

  const response = await fetch(`${WORKOS_USER_MANAGEMENT}/users/${workosUserId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("WorkOS delete user failed", {
      status: response.status,
      body: errorBody,
      workosUserId,
    });
    throw new Error(CREATE_USER_FAILED);
  }
}
