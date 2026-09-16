/** Loose client-side check before casting a path segment to `Id<"users">`. */
export function isLikelyUsersId(value: string): boolean {
  // Convex document ids are non-empty URL-safe strings without path separators.
  return value.length > 0 && !value.includes("/") && /^[a-zA-Z0-9_-]+$/.test(value);
}
