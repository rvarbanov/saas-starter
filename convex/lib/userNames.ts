/** Max length for a single name field (first or last). */
export const MAX_NAME_LENGTH = 100;

export type NormalizedNames = {
  firstName?: string;
  lastName?: string;
  name?: string;
};

/** Trim and validate first/last name; derive combined display `name`. */
export function normalizeNames(firstName: string, lastName: string): NormalizedNames {
  const first = firstName.trim();
  const last = lastName.trim();

  if (first.length > MAX_NAME_LENGTH) {
    throw new Error(`First name must be at most ${MAX_NAME_LENGTH} characters`);
  }
  if (last.length > MAX_NAME_LENGTH) {
    throw new Error(`Last name must be at most ${MAX_NAME_LENGTH} characters`);
  }

  const combined = [first, last].filter(Boolean).join(" ");

  return {
    firstName: first || undefined,
    lastName: last || undefined,
    name: combined || undefined,
  };
}

export type NameFormValues = {
  firstName: string;
  lastName: string;
};

/**
 * Values for profile name inputs. Prefer stored first/last; if those are empty
 * but combined `name` is present, split on the first space for initial display.
 */
export function namesForFormInputs(user: {
  firstName?: string;
  lastName?: string;
  name?: string;
}): NameFormValues {
  const first = user.firstName?.trim() ?? "";
  const last = user.lastName?.trim() ?? "";
  if (first || last) {
    return { firstName: first, lastName: last };
  }

  const combined = user.name?.trim() ?? "";
  if (!combined) {
    return { firstName: "", lastName: "" };
  }

  const space = combined.indexOf(" ");
  if (space === -1) {
    return { firstName: combined, lastName: "" };
  }

  return {
    firstName: combined.slice(0, space),
    lastName: combined.slice(space + 1).trim(),
  };
}
