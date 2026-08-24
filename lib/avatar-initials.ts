export function avatarInitials(input: {
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
}): string {
  const first = input.firstName?.trim() ?? "";
  const last = input.lastName?.trim() ?? "";
  if (first || last) {
    const letters = `${first.charAt(0)}${last.charAt(0)}`;
    return letters.toUpperCase() || "?";
  }

  const name = input.name?.trim() ?? "";
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    const firstPart = parts[0];
    const lastPart = parts.length > 1 ? parts[parts.length - 1] : undefined;
    if (firstPart && lastPart) {
      return `${firstPart.charAt(0)}${lastPart.charAt(0)}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
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
  name?: string;
}): string | undefined {
  const combined = [input.firstName?.trim(), input.lastName?.trim()].filter(Boolean).join(" ");
  if (combined) {
    return combined;
  }
  const name = input.name?.trim();
  return name || undefined;
}
