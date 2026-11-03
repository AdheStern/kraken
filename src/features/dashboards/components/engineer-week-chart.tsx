// src/features/dashboards/components/engineer-week-chart.tsx
// Horas reales de un ingeniero por semana del periodo: columnas de una sola serie con tooltip exacto y su tabla
// equivalente (AGENTS.md §6; dataviz: un eje, sin doble escala).
"use client";

import { useReducedMotion } from "motion/react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { formatMinutes } from "@/lib/format-minutes";
import type { EngineerDetail } from "../types";

const config = {
  hours: { label: "Horas", color: "var(--chart-1)" },
} satisfies ChartConfig;

const dayMonth = new Intl.DateTimeFormat("es-BO", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

export function EngineerWeekChart({
  weeks,
}: {
  weeks: EngineerDetail["weeks"];
}) {
  const animate = !useReducedMotion();
  // POR QUÉ: la altura admite horas con decimales; el tooltip y la tabla muestran el tiempo exacto.
  const data = weeks.map((w) => ({
    label: `sem. ${dayMonth.format(new Date(`${w.weekStart}T00:00:00Z`))}`,
    hours: w.minutes / 60,
    minutes: w.minutes,
  }));
  return (
    <figure className="kr-solid flex flex-col gap-2 rounded-xl p-4">
      <figcaption className="text-sm font-medium">
        Tiempo registrado por semana
      </figcaption>
      <ChartContainer config={config} className="aspect-auto h-56 w-full">
        <BarChart
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
          <YAxis tickLine={false} axisLine={false} width={32} />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(_, __, item) => (
                  <span className="font-medium tabular-nums">
                    {formatMinutes(
                      (item.payload as (typeof data)[number]).minutes,
                    )}
                  </span>
                )}
              />
            }
          />
          <Bar
            dataKey="hours"
            fill="var(--color-hours)"
            radius={[4, 4, 0, 0]}
            maxBarSize={32}
            isAnimationActive={animate}
          />
        </BarChart>
      </ChartContainer>
      <details className="text-sm">
        <summary className="cursor-pointer text-muted-foreground">
          Ver como tabla
        </summary>
        <table className="mt-2 w-full text-sm">
          <tbody className="tabular-nums">
            {data.map((d) => (
              <tr key={d.label} className="border-t border-border/60">
                <td className="py-1">{d.label}</td>
                <td className="py-1 text-right">{formatMinutes(d.minutes)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
