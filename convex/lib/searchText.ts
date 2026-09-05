/** Build denormalized lowercase search text for Users directory search. */
export function buildSearchText(parts: {
  firstName?: string | undefined;
  lastName?: string | undefined;
  email: string;
}): string {
  const tokens: string[] = [];
  if (parts.firstName !== undefined && parts.firstName.trim() !== "") {
    tokens.push(parts.firstName.trim());
  }
  if (parts.lastName !== undefined && parts.lastName.trim() !== "") {
    tokens.push(parts.lastName.trim());
  }
  if (parts.email.trim() !== "") {
    tokens.push(parts.email.trim());
  }
  return tokens.join(" ").toLowerCase();
}
