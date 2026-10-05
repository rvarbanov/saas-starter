/** Max length for a single name field (first or last). */
export const MAX_NAME_LENGTH = 100;

export type NormalizedNames = {
  firstName?: string;
  lastName?: string;
};

/** Trim and validate first and last name. Blank values stay unset. */
export function normalizeNames(firstName: string, lastName: string): NormalizedNames {
  const first = firstName.trim();
  const last = lastName.trim();

  if (first.length > MAX_NAME_LENGTH) {
    throw new Error(`First name must be at most ${MAX_NAME_LENGTH} characters`);
  }
  if (last.length > MAX_NAME_LENGTH) {
    throw new Error(`Last name must be at most ${MAX_NAME_LENGTH} characters`);
  }

  return {
    firstName: first || undefined,
    lastName: last || undefined,
  };
}

export type NameFormValues = {
  firstName: string;
  lastName: string;
};

/** Values for profile name inputs from stored first and last name. */
export function namesForFormInputs(user: {
  firstName?: string;
  lastName?: string;
}): NameFormValues {
  return {
    firstName: user.firstName?.trim() ?? "",
    lastName: user.lastName?.trim() ?? "",
  };
}
