/**
 * WorkOS AuthKit JWT validation for Convex functions.
 * Set `WORKOS_CLIENT_ID` on the Convex deployment (`npx convex env set WORKOS_CLIENT_ID …`).
 * @see https://docs.convex.dev/auth/authkit
 */
const clientId = process.env.WORKOS_CLIENT_ID ?? "";

export default {
  providers: [
    {
      type: "customJwt" as const,
      issuer: "https://api.workos.com/",
      algorithm: "RS256" as const,
      jwks: `https://api.workos.com/sso/jwks/${clientId}`,
      applicationID: clientId,
    },
    {
      type: "customJwt" as const,
      issuer: `https://api.workos.com/user_management/${clientId}`,
      algorithm: "RS256" as const,
      jwks: `https://api.workos.com/sso/jwks/${clientId}`,
    },
  ],
};
