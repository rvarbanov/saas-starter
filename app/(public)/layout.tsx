import { GlobalFooter } from "@/components/global-footer";
import { GlobalNav } from "@/components/global-nav";

export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <GlobalNav />
      {children}
      <GlobalFooter />
    </>
  );
}
