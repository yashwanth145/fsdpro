import type { Metadata } from "next";
import { Suspense } from "react";
import { PageShell } from "@/components/page-shell";
import { QuizSession } from "@/components/quiz/session";

export const metadata: Metadata = {
  title: "Quiz",
};

async function QuizContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <QuizSession quizId={id} />;
}

export default function QuizPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <PageShell>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading quiz…</p>}>
        <QuizContent params={params} />
      </Suspense>
    </PageShell>
  );
}
