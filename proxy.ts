import { authkitProxy } from "@workos-inc/authkit-nextjs";
import { AUTHKIT_UNAUTHENTICATED_PATHS } from "@/lib/auth-paths";

export default authkitProxy({
  middlewareAuth: {
    enabled: true,
    unauthenticatedPaths: [...AUTHKIT_UNAUTHENTICATED_PATHS],
  },
});

export const config = {
  // Exclude /sign-in/redirect: authkitProxy sets a PKCE cookie on every unauthenticated
  // request, but that route also calls getSignInUrl() — two sealed states → OAuth state mismatch.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sign-in/redirect|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
