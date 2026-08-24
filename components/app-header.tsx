"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AvatarMenu } from "@/components/avatar-menu";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { appBreadcrumbLeaf } from "@/lib/app-nav";
import { APP_ROUTES } from "@/lib/app-routes";

export function AppHeader() {
  const pathname = usePathname();
  const leaf = appBreadcrumbLeaf(pathname);

  return (
    <header
      data-testid="app-topbar"
      className="flex h-14 shrink-0 items-center gap-2 border-b px-4"
    >
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-4" />
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            {leaf ? (
              <BreadcrumbLink render={<Link href={APP_ROUTES.dashboard} />}>
                Dashboard
              </BreadcrumbLink>
            ) : (
              <BreadcrumbPage>Dashboard</BreadcrumbPage>
            )}
          </BreadcrumbItem>
          {leaf ? (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{leaf}</BreadcrumbPage>
              </BreadcrumbItem>
            </>
          ) : null}
        </BreadcrumbList>
      </Breadcrumb>
      <div className="ml-auto">
        <AvatarMenu />
      </div>
    </header>
  );
}
