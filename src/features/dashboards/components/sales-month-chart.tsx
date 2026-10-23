// src/features/dashboards/components/sales-month-chart.tsx
// Ventas aprobadas por mes contra la meta: columnas finas de una sola serie y la meta como marca por mes, con
// tooltip de montos exactos y su tabla equivalente (AGENTS.md §6; dataviz: un eje, sin doble escala).
"use client";

import { useReducedMotion } from "motion/react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
} from "recharts";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { formatAmount } from "@/lib/format-amount";
import type { SalesMonth } from "../types";

const config = {
  sale: { label: "Ventas", color: "var(--chart-1)" },
  goal: { label: "Meta", color: "var(--muted-foreground)" },
} satisfies ChartConfig;

const monthName = new Intl.DateTimeFormat("es-BO", {
  month: "short",
  timeZone: "UTC",
});
const compact = new Intl.NumberFormat("es-BO", { notation: "compact" });

export function SalesMonthChart({ months }: { months: SalesMonth[] }) {
  const animate = !useReducedMotion();
  const hasGoal = months.some((m) => m.goalUsd !== null);
  // POR QUÉ: la altura de la barra admite number; el tooltip y la tabla muestran el monto exacto en texto.
  const data = months.map((m) => ({
    label: monthName.format(new Date(`${m.month}-01T00:00:00Z`)),
    sale: Number(m.saleUsd),
    goal: m.goalUsd === null ? null : Number(m.goalUsd),
    exact: m,
  }));
  return (
    <figure className="flex flex-col gap-2">
      <ChartContainer config={config} className="aspect-auto h-64 w-full">
        <ComposedChart
          data={data}
          margin={{ left: 4, right: 8, top: 8 }}
          accessibilityLayer
        >
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={48}
            tickFormatter={(v: number) => compact.format(v)}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(_, name, item) => {
                  const m = (item.payload as (typeof data)[number]).exact;
                  const value = name === "goal" ? m.goalUsd : m.saleUsd;
                  return (
                    <span className="flex w-full justify-between gap-4">
                      <span className="text-muted-foreground">
                        {config[name as keyof typeof config].label}
                      </span>
                      <span className="font-medium tabular-nums">
                        {value === null ? "—" : `US$ ${formatAmount(value)}`}
                      </span>
                    </span>
                  );
                }}
              />
            }
          />
          {hasGoal && <ChartLegend content={<ChartLegendContent />} />}
          <Bar
            dataKey="sale"
            fill="var(--color-sale)"
            radius={[4, 4, 0, 0]}
            maxBarSize={24}
            isAnimationActive={animate}
          />
          {hasGoal && (
            <Line
              dataKey="goal"
              stroke="var(--color-goal)"
              strokeWidth={2}
              dot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
              connectNulls={false}
              isAnimationActive={animate}
            />
          )}
        </ComposedChart>
      </ChartContainer>
      <details className="text-sm">
        <summary className="cursor-pointer text-muted-foreground">
          Ver como tabla
        </summary>
        <table className="mt-2 w-full text-sm">
          <thead className="text-left text-muted-foreground">
            <tr>
              <th className="py-1 font-medium">Mes</th>
              <th className="py-1 text-right font-medium">Ventas (US$)</th>
              <th className="py-1 text-right font-medium">Meta (US$)</th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {data.map((d) => (
              <tr key={d.exact.month} className="border-t border-border/60">
                <td className="py-1">{d.label}</td>
                <td className="py-1 text-right">
                  {formatAmount(d.exact.saleUsd)}
                </td>
                <td className="py-1 text-right">
                  {d.exact.goalUsd ? formatAmount(d.exact.goalUsd) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
