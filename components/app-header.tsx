"use client";

import { useConvexAuth, useQuery } from "convex/react";
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
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { appBreadcrumbTrail, userDetailLeafLabel } from "@/lib/app-nav";
import { APP_ROUTES, parseUserDetailId, parseUserEditId, userDetailPath } from "@/lib/app-routes";
import { isConvexConfigured } from "@/lib/convex-config";
import { isLikelyUsersId } from "@/lib/convex-id";

function usePersonCrumb(pathname: string): { label: string; href?: string } | undefined {
  const detailId = parseUserDetailId(pathname);
  const editId = parseUserEditId(pathname);
  const rawId = editId ?? detailId;
  const { isAuthenticated, isLoading } = useConvexAuth();
  const userId = rawId !== null && isLikelyUsersId(rawId) ? (rawId as Id<"users">) : null;
  const ready = isConvexConfigured() && !isLoading && isAuthenticated && userId !== null;
  const user = useQuery(api.users.getById, ready ? { userId } : "skip");

  if (rawId === null) {
    return undefined;
  }
  if (user == null) {
    return { label: "User" };
  }
  const label = userDetailLeafLabel(user);
  if (editId !== null) {
    return { label, href: userDetailPath(editId) };
  }
  return { label };
}

export function AppHeader() {
  const pathname = usePathname();
  const person = usePersonCrumb(pathname);
  const trail = appBreadcrumbTrail(pathname, {
    ...(person !== undefined ? { userDetailLeaf: person.label, personHref: person.href } : {}),
  });

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
            {trail.length > 0 ? (
              <BreadcrumbLink render={<Link href={APP_ROUTES.dashboard} />}>
                Dashboard
              </BreadcrumbLink>
            ) : (
              <BreadcrumbPage>Dashboard</BreadcrumbPage>
            )}
          </BreadcrumbItem>
          {trail.map((segment) => (
            <BreadcrumbSegmentItems
              key={`${segment.label}:${segment.href ?? "leaf"}`}
              segment={segment}
            />
          ))}
        </BreadcrumbList>
      </Breadcrumb>
      <div className="ml-auto">
        <AvatarMenu />
      </div>
    </header>
  );
}

function BreadcrumbSegmentItems({ segment }: { segment: { label: string; href?: string } }) {
  return (
    <>
      <BreadcrumbSeparator />
      <BreadcrumbItem>
        {segment.href ? (
          <BreadcrumbLink render={<Link href={segment.href} />}>{segment.label}</BreadcrumbLink>
        ) : (
          <BreadcrumbPage>{segment.label}</BreadcrumbPage>
        )}
      </BreadcrumbItem>
    </>
  );
}
