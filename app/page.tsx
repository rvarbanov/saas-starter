import { withAuth } from "@workos-inc/authkit-nextjs";
import Link from "next/link";
import { ConvexStatus } from "@/components/convex-status";
import { ExternalLinkButton } from "@/components/external-link-button";

export default async function Home() {
  const auth = await withAuth();

  return (
    <main className="mx-auto flex min-h-full w-full max-w-3xl flex-col justify-center gap-8 px-6 py-24">
      <p className="text-sm font-medium text-muted-foreground">SaaS Starter Kit</p>
      <h1 className="text-4xl font-semibold tracking-tight text-foreground">
        AI-ready SaaS template
      </h1>
      <p className="max-w-xl text-lg text-muted-foreground">
        Next.js App Router, Tailwind CSS, shadcn/ui, Convex, and WorkOS AuthKit are wired. Docker
        and CI follow in later milestones—see repository docs for the roadmap.
      </p>
      <ConvexStatus />
      <div className="flex flex-wrap items-center gap-3">
        {auth.user ? (
          <Link
            className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
            href="/dashboard"
          >
            Dashboard
          </Link>
        ) : (
          <Link
            className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
            href="/sign-in"
          >
            Sign in
          </Link>
        )}
        <ExternalLinkButton
          href="https://github.com/rvarbanov/saas-starter"
          rel="noopener noreferrer"
          target="_blank"
        >
          View on GitHub
        </ExternalLinkButton>
      </div>
    </main>
  );
}
