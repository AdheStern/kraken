// src/app/(app)/inicio/page.tsx
// Inicio: el centro de la red. Saludo, lo que espera al usuario según su rol como nodos vivos y, debajo, las
// aprobaciones pendientes y las bolsas en riesgo (AGENTS.md §5 Navegación; tableros por rol en F5).
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { toBusinessDate } from "@/domain/calendar/business-date";
import {
  HomeNetwork,
  type HomeNode,
} from "@/features/home/components/home-network";
import {
  getHomeSummary,
  type HomeSummary,
} from "@/features/home/queries/get-home-summary";
import { systemClock } from "@/server/clock";
import { requireUser } from "@/server/session";
import { ApprovalsPanel } from "./approvals-panel";
import { RiskPanel } from "./risk-panel";
import { TimersPanel } from "./timers-panel";

export const metadata: Metadata = { title: "Inicio" };

const dayFormat = new Intl.DateTimeFormat("es-BO", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-8 sm:px-6">
      <Suspense fallback={<Skeleton className="h-72 w-full rounded-xl" />}>
        <Home />
      </Suspense>
    </main>
  );
}

async function Home() {
  const user = await requireUser();
  // REGLA: el inicio del almacenero es el POS (§5 navegación).
  if (user.roles.length > 0 && user.roles.every((r) => r.code === "ALMACEN"))
    redirect("/inventario/pos");
  const summary = await getHomeSummary(user);
  const now = systemClock.now();
  const today = dayFormat.format(new Date(`${toBusinessDate(now)}T00:00:00Z`));
  return (
    <>
      <HomeNetwork
        greeting={`Hola, ${summary.firstName}`}
        subtitle={`${today[0].toUpperCase()}${today.slice(1)} · ${headline(summary)}`}
        nodes={toNodes(summary)}
      />
      {summary.timers && summary.timers.length > 0 && (
        <TimersPanel timers={summary.timers} />
      )}
      {(summary.approvals || summary.bagsAtRisk) && (
        <div className="grid gap-5 md:grid-cols-2">
          {summary.approvals && (
            <ApprovalsPanel items={summary.approvals} now={now.getTime()} />
          )}
          {summary.bagsAtRisk && <RiskPanel bags={summary.bagsAtRisk} />}
        </div>
      )}
    </>
  );
}

function toNodes(s: HomeSummary): HomeNode[] {
  const nodes: HomeNode[] = [];
  if (s.myTickets !== null)
    nodes.push({
      key: "tickets",
      label: "Mis tickets",
      hint: "abiertos a tu cargo",
      value: s.myTickets,
      href: "/tickets?vista=mios",
      isAlert: false,
    });
  if (s.approvals)
    nodes.push({
      key: "aprobaciones",
      label: "Aprobaciones",
      hint: "esperan tu decisión",
      value: s.approvals.length,
      href: "/aprobaciones",
      isAlert: s.approvals.length > 0,
    });
  // POR QUÉ: los nodos de inventario solo aparecen cuando hay algo; la red tiene tres lugares.
  if (s.adjustmentsToDecide)
    nodes.push({
      key: "ajustes",
      label: "Ajustes",
      hint: "de inventario por decidir",
      value: s.adjustmentsToDecide,
      href: "/inventario/ajustes",
      isAlert: true,
    });
  if (s.transfersInTransit)
    nodes.push({
      key: "traspasos",
      label: "Traspasos",
      hint: "con algo en camino",
      value: s.transfersInTransit,
      href: "/inventario/traspasos",
      isAlert: false,
    });
  if (s.bagsAtRisk)
    nodes.push({
      key: "bolsas",
      label: "Bolsas en riesgo",
      hint: `de ${s.activeBags ?? 0} activas`,
      value: s.bagsAtRisk.length,
      href: "/horas",
      isAlert: s.bagsAtRisk.length > 0,
    });
  if (s.drafts !== null)
    nodes.push({
      key: "borradores",
      label: "CV en borrador",
      hint: "para completar",
      value: s.drafts,
      href: "/cv?estado=BORRADOR",
      isAlert: false,
    });
  return nodes;
}

function headline(s: HomeSummary): string {
  const parts = [
    s.approvals?.length
      ? `${s.approvals.length} ${s.approvals.length === 1 ? "aprobación espera" : "aprobaciones esperan"} tu decisión`
      : null,
    s.bagsAtRisk?.length
      ? `${s.bagsAtRisk.length} ${s.bagsAtRisk.length === 1 ? "bolsa está" : "bolsas están"} en riesgo`
      : null,
  ].filter(Boolean);
  if (parts.length > 0) return `${parts.join(" y ")}.`;
  return s.approvals ||
    s.bagsAtRisk ||
    s.drafts !== null ||
    s.myTickets !== null
    ? "Todo al día."
    : "Bienvenido a Kraken.";
}
