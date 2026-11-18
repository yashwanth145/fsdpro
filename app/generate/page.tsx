import type { Metadata } from "next";
import { Suspense } from "react";
import { PageShell } from "@/components/page-shell";
import { QuizGenerator } from "@/components/quiz/generator";

export const metadata: Metadata = {
  title: "Generate a quiz",
};

export default function GeneratePage() {
  return (
    <PageShell>
      <div className="mb-8 max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight">Quiz builder</h1>
        <p className="mt-2 text-muted-foreground">
          Pick a category and difficulty. The quiz is a random set of multiple-choice questions from that pair. Add a description if you want it shown on the quiz.
        </p>
      </div>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading the form…</p>}>
        <QuizGenerator />
      </Suspense>
    </PageShell>
  );
}
