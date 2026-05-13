import { authkitProxy } from "@workos-inc/authkit-nextjs";
import { AUTHKIT_UNAUTHENTICATED_PATHS } from "@/lib/auth-paths";

export default authkitProxy({
  middlewareAuth: {
    enabled: true,
    unauthenticatedPaths: [...AUTHKIT_UNAUTHENTICATED_PATHS],
  },
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
