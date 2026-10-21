"use client";

import { LayoutDashboard, type LucideIcon, Sparkles, Users } from "lucide-react";
import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { useCan } from "@/components/use-can";
import { APP_NAV_ITEMS, isAppNavActive } from "@/lib/app-nav";
import { APP_ROUTES } from "@/lib/app-routes";
import { isConvexConfigured } from "@/lib/convex-config";

/** Native `<a>` — ignore Base UI's merged button onClick so href navigation is not preventDefaulted. */
function AppNavLink({
  href,
  title,
  children,
  onClick: _onClick,
  ...props
}: ComponentProps<"a"> & { href: string; title?: string }) {
  return (
    <a {...props} href={href} title={title} data-app-nav={title ?? href}>
      {children}
    </a>
  );
}

const NAV_ICONS: Record<string, LucideIcon> = {
  [APP_ROUTES.dashboard]: LayoutDashboard,
  [APP_ROUTES.users]: Users,
  [APP_ROUTES.comingSoon]: Sparkles,
};

export function AppSidebar() {
  const pathname = usePathname();
  const configured = isConvexConfigured();
  const canListUsers = useCan({ domain: "users", action: "list" });

  return (
    <Sidebar variant="inset" collapsible="icon" data-testid="app-sidebar">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton render={<AppNavLink href={APP_ROUTES.dashboard} />} size="lg">
              <span className="truncate font-semibold">SaaS Starter Kit</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <nav aria-label="App">
              <SidebarMenu>
                {APP_NAV_ITEMS.map((item) => {
                  if (item.href === APP_ROUTES.users && configured) {
                    if (canListUsers === undefined) {
                      return (
                        <SidebarMenuItem key={item.href}>
                          <Skeleton className="h-8 w-full" data-testid="users-nav-pending" />
                        </SidebarMenuItem>
                      );
                    }
                    if (!canListUsers) {
                      return null;
                    }
                  }
                  const Icon = NAV_ICONS[item.href];
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        isActive={isAppNavActive(pathname, item.href, item.match)}
                        render={<AppNavLink href={item.href} title={item.title} />}
                      >
                        {Icon ? <Icon /> : null}
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </nav>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
