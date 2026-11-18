import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>© 2026 Lumina. Quizzes are drawn from the question bank.</p>
        <nav aria-label="Footer" className="flex gap-4">
          <Link className="hover:text-foreground" href="/dashboard">Dashboard</Link>
          <Link className="hover:text-foreground" href="/generate">Generate</Link>
          <Link className="hover:text-foreground" href="/history">History</Link>
        </nav>
      </div>
    </footer>
  );
}
