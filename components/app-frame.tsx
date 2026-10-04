"use client";

import { AppFooter } from "@/components/app-footer";
import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

export function AppFrame({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <SidebarProvider defaultOpen>
        <AppSidebar />
        <SidebarInset className="min-w-0">
          <AppHeader />
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
          <AppFooter />
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
