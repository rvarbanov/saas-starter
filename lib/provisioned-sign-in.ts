const STORAGE_PREFIX = "app-user-provisioned:";

function storageKey(sessionId: string): string {
  return `${STORAGE_PREFIX}${sessionId}`;
}

function canUseSessionStorage(): boolean {
  return typeof sessionStorage !== "undefined";
}

/** True after `provisionUser` succeeded for this WorkOS sign-in. */
export function hasProvisionedThisSignIn(sessionId: string): boolean {
  if (!sessionId || !canUseSessionStorage()) {
    return false;
  }
  return sessionStorage.getItem(storageKey(sessionId)) === "1";
}

/** Remember a successful provision for this WorkOS sign-in. No-op without a session id. */
export function markProvisionedThisSignIn(sessionId: string): void {
  if (!sessionId || !canUseSessionStorage()) {
    return;
  }
  sessionStorage.setItem(storageKey(sessionId), "1");
}
