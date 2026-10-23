// src/app/(app)/tableros/page.tsx
// Entrada de los tableros: lleva al primero que el rol puede abrir (AGENTS.md §2.9 "Tableros", §5 navegación).
import { notFound, redirect } from "next/navigation";
import { visibleBoards } from "@/features/dashboards/queries/load-dashboard-context";
import { requireUser } from "@/server/session";

export default async function DashboardsPage() {
  const user = await requireUser();
  const [first] = visibleBoards(user);
  if (!first) notFound();
  redirect(`/tableros/${first}`);
}
