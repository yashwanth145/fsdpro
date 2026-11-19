import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";
import { AdminQuestions } from "@/components/admin/question-manager";

export const metadata: Metadata = {
  title: "Question bank",
};

export default function AdminPage() {
  return (
    <PageShell>
      <div className="mb-8 max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight">Question bank</h1>
        <p className="mt-2 text-muted-foreground">
          Add a multiple-choice question, edit one already in the bank, or select questions and delete them.
        </p>
      </div>
      <AdminQuestions />
    </PageShell>
  );
}
