import { ExternalLinkButton } from "@/components/external-link-button";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-full w-full max-w-3xl flex-col justify-center gap-8 px-6 py-24">
      <p className="text-sm font-medium text-muted-foreground">SaaS Starter Kit</p>
      <h1 className="text-4xl font-semibold tracking-tight text-foreground">
        AI-ready SaaS template
      </h1>
      <p className="max-w-xl text-lg text-muted-foreground">
        Next.js App Router, Tailwind CSS, and shadcn/ui are wired. WorkOS, Convex, and Docker land
        in later milestones—see repository docs for the roadmap.
      </p>
      <div className="flex flex-wrap gap-3">
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
