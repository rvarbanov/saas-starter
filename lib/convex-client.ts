import { ConvexReactClient } from "convex/react";
import { isConvexConfigured } from "./convex-config";

let client: ConvexReactClient | null = null;

/** Shared browser client — must not be recreated or closed on React remounts. */
export function getConvexClient(): ConvexReactClient | null {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL?.trim();
  if (!url || !isConvexConfigured()) {
    return null;
  }

  if (!client) {
    client = new ConvexReactClient(url);
  }

  return client;
}

/** Close before a full-page sign-out navigation; next load creates a fresh client. */
export function closeConvexClient(): void {
  if (!client) {
    return;
  }
  void client.close();
  client = null;
}
