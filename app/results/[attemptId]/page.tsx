import type { Metadata } from "next";
import { Suspense } from "react";
import { PageShell } from "@/components/page-shell";
import { ResultsView } from "@/components/quiz/results";

export const metadata: Metadata = {
  title: "Results",
};

async function ResultsContent({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  return <ResultsView attemptId={attemptId} />;
}

export default function ResultsPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  return (
    <PageShell>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading results…</p>}>
        <ResultsContent params={params} />
      </Suspense>
    </PageShell>
  );
}
