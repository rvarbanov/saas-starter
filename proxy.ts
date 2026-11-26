import { authkitProxy } from "@workos-inc/authkit-nextjs";
import { workosRedirectUri } from "@/lib/app-origin";
import { AUTHKIT_UNAUTHENTICATED_PATHS } from "@/lib/auth-paths";

export default authkitProxy({
  // Dynamic on Vercel Preview: ignore committed localhost NEXT_PUBLIC_WORKOS_REDIRECT_URI.
  redirectUri: workosRedirectUri(),
  middlewareAuth: {
    enabled: true,
    unauthenticatedPaths: [...AUTHKIT_UNAUTHENTICATED_PATHS],
  },
  signUpPaths: ["/sign-up/start"],
});

export const config = {
  // Exclude /callback: handleAuth owns the OAuth exchange; proxy must not rewrite PKCE cookies.
  // Exclude /sign-in/redirect: that route also starts OAuth — two sealed states → mismatch.
  // Exclude /api/health: public probe should not run AuthKit session/PKCE work.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|callback|sign-in/redirect|api/health|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
