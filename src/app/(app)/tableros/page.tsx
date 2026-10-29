// src/app/(app)/tableros/page.tsx
// Entrada de los tableros: lleva al primero que el rol puede abrir (AGENTS.md §2.9 "Tableros", §5 navegación).
// TRAMPA: con Cache Components, leer la sesión fuera de <Suspense> impide prerenderizar y rompe el build.
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { visibleBoards } from "@/features/dashboards/queries/load-dashboard-context";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Tableros" };

export default function DashboardsPage() {
  return (
    <Suspense fallback={null}>
      <FirstBoard />
    </Suspense>
  );
}

async function FirstBoard(): Promise<null> {
  const user = await requireUser();
  const [first] = visibleBoards(user);
  if (!first) notFound();
  redirect(`/tableros/${first}`);
}
