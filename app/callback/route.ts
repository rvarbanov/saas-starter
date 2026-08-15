import { handleAuth } from "@workos-inc/authkit-nextjs";
import { APP_ROUTES } from "@/lib/app-routes";

export const GET = handleAuth({ returnPathname: APP_ROUTES.dashboard });
