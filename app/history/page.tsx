import type { Metadata } from "next";
import { HistoryList } from "@/components/dashboard-view";
import { PageShell } from "@/components/page-shell";

export const metadata: Metadata = {
  title: "History",
};

export default function HistoryPage() {
  return (
    <PageShell>
      <HistoryList />
    </PageShell>
  );
}
