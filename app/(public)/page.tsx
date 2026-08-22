import Link from "next/link";
import { AuthHomeCta } from "@/components/auth-home-cta";
import { ConvexStatus } from "@/components/convex-status";
import { ExternalLinkButton } from "@/components/external-link-button";
import { GITHUB_REPO_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <main className="page-main-centered">
      <p className="text-eyebrow">SaaS Starter Kit</p>
      <h1 className="heading-hero">AI-ready SaaS template</h1>
      <p className="text-lead">
        Next.js App Router, Tailwind CSS, shadcn/ui, Convex, and WorkOS AuthKit are wired. Docker
        and CI follow in later milestones—see repository docs for the roadmap.
      </p>
      <ConvexStatus />
      <div className="action-row-tight">
        <AuthHomeCta />
        <Link className="btn-outline" href="/sign-up">
          Sign up
        </Link>
        <ExternalLinkButton
          href={GITHUB_REPO_URL}
          rel="noopener noreferrer"
          target="_blank"
        >
          View on GitHub
        </ExternalLinkButton>
      </div>
    </main>
  );
}
