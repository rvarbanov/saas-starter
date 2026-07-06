const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Trim and lowercase for storage and uniqueness checks. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Reject obvious invalid addresses before WorkOS or DB writes. */
export function assertValidEmailFormat(email: string): void {
  const normalized = normalizeEmail(email);
  if (!normalized || !EMAIL_FORMAT.test(normalized)) {
    throw new Error("Invalid email address");
  }
}
