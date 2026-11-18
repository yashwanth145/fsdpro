import type { Metadata } from "next";
import { DashboardView } from "@/components/dashboard-view";
import { PageShell } from "@/components/page-shell";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default function DashboardPage() {
  return (
    <PageShell>
      <DashboardView />
    </PageShell>
  );
}
