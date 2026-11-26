// src/features/dashboards/components/term-contracts-ops-panel.tsx
// Contratos por vigencia activos hoy en el tablero operativo: cuántos, uso, tope, vencimientos y los de más uso
// con enlace a su libro (AGENTS.md §2.4, §6). Sin montos (regla 12).
import Link from "next/link";
import { formatMinutes } from "@/lib/format-minutes";
import type { OperationsDashboard } from "../types";

type Props = { board: OperationsDashboard };

export function TermContractsOpsPanel({ board }: Props) {
  const { summary, top } = board.termContracts;
  return (
    <section className="kr-solid flex flex-col gap-3 rounded-xl p-4">
      <h2 className="text-sm font-medium">
        Contratos por vigencia · {summary.active} activos hoy
      </h2>
      {summary.active === 0 ? (
        <p className="text-sm text-muted-foreground">
          No hay contratos por vigencia activos. Se abren al aprobarse un CV con
          «Soporte por vigencia» en una línea.
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <dl className="flex flex-col gap-1.5 text-sm">
            <Row label="Sin tope" value={String(summary.uncapped)} />
            <Row
              label="Con tope cerca de agotarse"
              value={String(summary.nearCap)}
            />
            <Row
              label="Usado en total"
              value={formatMinutes(summary.usedMinutes)}
            />
            <Row
              label={`Usado en ${board.periodLabel}`}
              value={formatMinutes(board.hours.termUsedMinutes)}
            />
            {summary.expiring.map((band) => (
              <Row
                key={band.days}
                label={`Vencen en ${band.days} días o menos`}
                value={String(band.count)}
              />
            ))}
          </dl>
          <ul
            className="flex flex-col gap-1.5 text-sm"
            aria-label="Los de más uso"
          >
            {top.map((bag) => (
              <li
                key={bag.id}
                className="flex items-baseline justify-between gap-3"
              >
                <Link
                  href={`/horas/${bag.id}`}
                  className="min-w-0 truncate hover:underline"
                >
                  {bag.customerName} · {bag.cvLabel}
                </Link>
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  {usageText(bag)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

type Bag = OperationsDashboard["termContracts"]["top"][number];

function usageText(bag: Bag): string {
  const used = bag.isUncapped
    ? `${formatMinutes(bag.consumedMinutes)} usadas`
    : `${bag.consumedPct}% del tope`;
  return bag.daysToExpiry === null
    ? used
    : `${used} · vence en ${bag.daysToExpiry} días`;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium tabular-nums">{value}</dd>
    </div>
  );
}
