import { withAuth } from "@workos-inc/authkit-nextjs";
import { AppFrame } from "@/components/app-frame";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await withAuth({ ensureSignedIn: true });

  return <AppFrame>{children}</AppFrame>;
}
