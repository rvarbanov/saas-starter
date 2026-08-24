"use client";

import { type LucideIcon, LayoutDashboard, Sparkles, Users } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ComponentProps, MouseEvent } from "react";
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

function isModifiedClick(event: MouseEvent<HTMLAnchorElement>): boolean {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0;
}

function AppNavLink({
  href,
  title,
  children,
  onClick,
  ...props
}: ComponentProps<typeof Link> & { href: string; title?: string }) {
  const router = useRouter();
  return (
    <Link
      {...props}
      href={href}
      title={title}
      onClick={(event) => {
        onClick?.(event);
        if (isModifiedClick(event)) {
          return;
        }
        event.preventDefault();
        router.push(href);
      }}
    >
      {children}
    </Link>
  );
}

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
