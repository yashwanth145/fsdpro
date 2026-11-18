"use client";

import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <PageShell>
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="mt-2 max-w-xl text-sm text-muted-foreground">{error.message}</p>
      <Button className="mt-6" onClick={reset}>Try again</Button>
    </PageShell>
  );
}
