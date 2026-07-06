import type { UserIdentity } from "convex/server";

/** Read email from standard or WorkOS JWT template custom claims. */
export function extractEmailFromIdentity(identity: UserIdentity): string | undefined {
  if (typeof identity.email === "string" && identity.email.trim()) {
    return identity.email;
  }

  for (const key of ["user.email", "user_email", "email_address"]) {
    const value = identity[key];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  return undefined;
}

/** Prefer explicit name claims when the combined `name` field is absent. */
export function extractNameFromIdentity(identity: UserIdentity): string | undefined {
  if (typeof identity.name === "string" && identity.name.trim()) {
    return identity.name;
  }

  const given = identity.givenName?.trim();
  const family = identity.familyName?.trim();
  const combined = [given, family].filter(Boolean).join(" ");
  return combined || undefined;
}
