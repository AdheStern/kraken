// src/app/(app)/aprobaciones/page.tsx
// Bandeja de aprobaciones del gerente de área y del gerente general (AGENTS.md §5, Navegación).
import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { ModuleHeading } from "@/components/app-shell/module-heading";
import { Skeleton } from "@/components/ui/skeleton";
import { ApprovalInbox } from "@/features/sales-control/components/approvals/approval-inbox";
import { listPendingApprovals } from "@/features/sales-control/queries/list-pending-approvals";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Aprobaciones" };

export default function ApprovalsPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-8 sm:px-6">
      <ModuleHeading
        title="Aprobaciones"
        description="CV que esperan tu decisión, del más antiguo al más reciente. Las demás áreas deciden en paralelo."
      />
      <Suspense fallback={<Skeleton className="h-64 w-full rounded-xl" />}>
        <PendingApprovals />
      </Suspense>
    </main>
  );
}

async function PendingApprovals() {
  await connection();
  const user = await requireUser();
  const items = await listPendingApprovals(user);
  return <ApprovalInbox items={items} now={Date.now()} />;
}
