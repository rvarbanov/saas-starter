/**
 * Convex `tokenIdentifier` is `iss|sub` from the AuthKit JWT.
 * Create User reuses the creator's live issuer so the new Auth user matches
 * provision/`store` lookups after first sign-in.
 */
export function tokenIdentifierForCreatedUser(
  creatorTokenIdentifier: string,
  workosUserId: string,
): string {
  const separator = creatorTokenIdentifier.lastIndexOf("|");
  if (separator <= 0 || separator === creatorTokenIdentifier.length - 1) {
    throw new Error("Invalid creator token identifier");
  }
  if (!workosUserId.trim()) {
    throw new Error("WorkOS user id required");
  }
  const iss = creatorTokenIdentifier.slice(0, separator);
  return `${iss}|${workosUserId}`;
}

export function issuerFromTokenIdentifier(tokenIdentifier: string): string {
  const separator = tokenIdentifier.lastIndexOf("|");
  if (separator <= 0) {
    throw new Error("Invalid token identifier");
  }
  return tokenIdentifier.slice(0, separator);
}
