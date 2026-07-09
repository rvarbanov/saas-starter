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
