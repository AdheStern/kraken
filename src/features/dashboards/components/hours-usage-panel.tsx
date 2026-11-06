// src/features/dashboards/components/hours-usage-panel.tsx
// «Uso de las horas vendidas» del tablero operativo: por cliente, tecnología o área, vendido, descontado, vencido
// sin usar, % de uso y lo trabajado sin bolsa, que avisa que se cotizó de menos (decisión 2026-11-05). Sin montos.
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { UsageRow } from "@/domain/dashboards/hours-usage";
import { formatMinutes } from "@/lib/format-minutes";
import type { HoursUsageView } from "../types";

const VIEWS = [
  { key: "byCustomer", label: "Cliente" },
  { key: "byTechnology", label: "Tecnología" },
  { key: "byArea", label: "Área" },
] as const;

const MAX_ROWS = 10;

export function HoursUsagePanel({ usage }: { usage: HoursUsageView }) {
  const [view, setView] = useState<(typeof VIEWS)[number]["key"]>("byCustomer");
  const rows = usage[view].slice(0, MAX_ROWS);
  return (
    <section className="kr-solid flex flex-col gap-3 rounded-xl p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-medium">Uso de las horas vendidas</h2>
        <fieldset className="flex gap-1">
          <legend className="sr-only">Agrupar por</legend>
          {VIEWS.map((v) => (
            <Button
              key={v.key}
              size="sm"
              variant={view === v.key ? "default" : "ghost"}
              aria-pressed={view === v.key}
              onClick={() => setView(v.key)}
            >
              {v.label}
            </Button>
          ))}
        </fieldset>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No hay bolsas de horas activas en el periodo con estos filtros.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="text-left">
                <th className="py-1 pr-3 font-medium">Grupo</th>
                <th className="py-1 pr-3 text-right font-medium">Vendidas</th>
                <th className="py-1 pr-3 text-right font-medium">
                  Descontadas
                </th>
                <th className="py-1 pr-3 text-right font-medium">Uso</th>
                <th className="py-1 pr-3 text-right font-medium">Vencidas</th>
                {view === "byCustomer" && (
                  <th className="py-1 text-right font-medium">Sin bolsa</th>
                )}
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {rows.map((row) => (
                <UsageLine
                  key={row.key}
                  row={row}
                  withPending={view === "byCustomer"}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
      {view === "byCustomer" && (
        <p className="text-xs text-muted-foreground">
          «Sin bolsa» es trabajo cerrado que no cupo en lo vendido: ese cliente
          necesita más horas o se le cotizó de menos.
        </p>
      )}
    </section>
  );
}

function UsageLine({
  row,
  withPending,
}: {
  row: UsageRow;
  withPending: boolean;
}) {
  return (
    <tr className="border-t border-border/60">
      <td className="py-1.5 pr-3">
        {row.label}
        <span className="text-xs text-muted-foreground">
          {" "}
          · {row.bags} {row.bags === 1 ? "bolsa" : "bolsas"}
        </span>
      </td>
      <td className="py-1.5 pr-3 text-right">
        {formatMinutes(row.soldMinutes)}
      </td>
      <td className="py-1.5 pr-3 text-right">
        {formatMinutes(row.consumedMinutes)}
      </td>
      <td className="py-1.5 pr-3 text-right font-medium">
        {row.usagePct === null ? "—" : `${row.usagePct}%`}
      </td>
      <td className="py-1.5 pr-3 text-right">
        {formatMinutes(row.expiredMinutes)}
      </td>
      {withPending && (
        <td
          className={`py-1.5 text-right ${row.pendingMinutes > 0 ? "font-medium text-warning" : ""}`}
        >
          {formatMinutes(row.pendingMinutes)}
        </td>
      )}
    </tr>
  );
}
