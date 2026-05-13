/**
 * Convex client must not be constructed with a fake URL — it throws at runtime.
 * Leave `NEXT_PUBLIC_CONVEX_URL` unset or set it to your dev URL from `npx convex dev`.
 */
export function isConvexConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL?.trim();
  if (!url) {
    return false;
  }
  if (/placeholder/i.test(url)) {
    return false;
  }
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && parsed.hostname.endsWith(".convex.cloud");
  } catch {
    return false;
  }
}
