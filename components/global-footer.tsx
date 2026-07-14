import { GITHUB_REPO_URL } from "@/lib/site";

export function GlobalFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer mt-auto">
      <div className="footer-bar">
        <p className="footer-copy">Copyright © {year}</p>
        <span aria-hidden="true">·</span>
        <a
          className="link-nav"
          href={GITHUB_REPO_URL}
          rel="noopener noreferrer"
          target="_blank"
        >
          Created by rvarbanov
        </a>
      </div>
    </footer>
  );
}
