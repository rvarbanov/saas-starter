import { GITHUB_REPO_URL } from "@/lib/site";

export function AppFooter() {
  const year = new Date().getFullYear();

  return (
    <footer
      data-testid="app-footer"
      className="mt-auto border-t px-4 py-3 text-sm text-muted-foreground"
    >
      <div className="flex flex-wrap items-center justify-center gap-3">
        <p className="m-0">Copyright © {year}</p>
        <span aria-hidden="true">·</span>
        <a className="link-nav" href={GITHUB_REPO_URL} rel="noopener noreferrer" target="_blank">
          Created by rvarbanov
        </a>
      </div>
    </footer>
  );
}
