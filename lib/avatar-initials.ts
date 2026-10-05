export function avatarInitials(input: {
  firstName?: string;
  lastName?: string;
  email?: string;
}): string {
  const first = input.firstName?.trim() ?? "";
  const last = input.lastName?.trim() ?? "";
  if (first || last) {
    const letters = `${first.charAt(0)}${last.charAt(0)}`;
    return letters.toUpperCase() || "?";
  }

  const local = input.email?.split("@")[0]?.trim() ?? "";
  if (local) {
    return local.charAt(0).toUpperCase();
  }

  return "?";
}

export function avatarDisplayName(input: {
  firstName?: string;
  lastName?: string;
}): string | undefined {
  const combined = [input.firstName?.trim(), input.lastName?.trim()].filter(Boolean).join(" ");
  return combined || undefined;
}
