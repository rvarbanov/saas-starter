"use client";

import type { ComponentProps, ReactNode } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

type ExternalLinkButtonProps = {
  href: string;
  children: ReactNode;
} & Omit<ComponentProps<typeof Link>, "href" | "children">;

/**
 * Primary-styled external link using shadcn {@link Button} + Next.js {@link Link}
 * (Base UI `render` + `nativeButton={false}`). Keeps pages as Server Components by
 * colocating client UI in this wrapper.
 */
export function ExternalLinkButton({ href, children, ...linkProps }: ExternalLinkButtonProps) {
  return (
    <Button nativeButton={false} render={<Link href={href} {...linkProps} />}>
      {children}
    </Button>
  );
}
