"use client";

import { useAuth } from "@workos-inc/authkit-nextjs/components";
import { useConvexAuth, useQuery } from "convex/react";
import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api } from "@/convex/_generated/api";
import { avatarDisplayName, avatarInitials } from "@/lib/avatar-initials";
import { APP_ROUTES } from "@/lib/app-routes";
import { isConvexConfigured } from "@/lib/convex-config";
import { signOutFromApp } from "@/lib/sign-out-client";

export function AvatarMenu() {
  const { user: workosUser } = useAuth();
  const convexUser = useConvexMe();
  const email = convexUser?.email ?? workosUser?.email ?? undefined;
  const name = avatarDisplayName({
    firstName: convexUser?.firstName,
    lastName: convexUser?.lastName,
    name: convexUser?.name,
  });
  const initials = avatarInitials({
    firstName: convexUser?.firstName,
    lastName: convexUser?.lastName,
    name: convexUser?.name,
    email,
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" aria-label="Account" className="rounded-full" />
        }
      >
        <Avatar size="sm">
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-0.5">
            {name ? <span className="text-sm font-medium text-foreground">{name}</span> : null}
            {email ? <span className="text-xs">{email}</span> : null}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href={APP_ROUTES.profile} />}>Profile</DropdownMenuItem>
        <DropdownMenuItem render={<Link href={APP_ROUTES.settings} />}>Settings</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOutFromApp}>Sign out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function useConvexMe() {
  const configured = isConvexConfigured();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const ready = configured && !isLoading && isAuthenticated;
  return useQuery(api.users.getMe, ready ? {} : "skip");
}
