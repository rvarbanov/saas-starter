"use client";

import { type LucideIcon, LayoutDashboard, Sparkles, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
import { APP_NAV_ITEMS, isAppNavActive } from "@/lib/app-nav";
import { APP_ROUTES } from "@/lib/app-routes";

const NAV_ICONS: Record<string, LucideIcon> = {
  [APP_ROUTES.dashboard]: LayoutDashboard,
  [APP_ROUTES.users]: Users,
  [APP_ROUTES.comingSoon]: Sparkles,
};

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar variant="inset" collapsible="icon" data-testid="app-sidebar">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton render={<Link href={APP_ROUTES.dashboard} />} size="lg">
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
                  const Icon = NAV_ICONS[item.href];
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        isActive={isAppNavActive(pathname, item.href, item.match)}
                        tooltip={item.title}
                        render={<Link href={item.href} />}
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
