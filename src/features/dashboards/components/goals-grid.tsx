// src/features/dashboards/components/goals-grid.tsx
// Grilla de metas área × mes, como la planilla que DIMA ya usa: se escribe en la celda y se guarda sola; pegar un
// monto con separadores de Excel también sirve (AGENTS.md §6, PRODUCT.md).
import type { GoalIndicator } from "@/generated/prisma/enums";
import type { GoalRow } from "../queries/get-goals-grid";
import { GoalCell } from "./goal-cell";

const MONTHS = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

const UNIT: Record<GoalIndicator, string> = {
  VENTAS_USD: "US$",
  MARGEN_USD: "US$",
  HORAS_VENDIDAS: "horas",
};

type Props = { rows: GoalRow[]; year: number; indicator: GoalIndicator };

export function GoalsGrid({ rows, year, indicator }: Props) {
  return (
    <section className="kr-solid flex flex-col gap-2 rounded-xl p-4">
      <p className="text-sm text-muted-foreground">
        Metas en {UNIT[indicator]} por mes de {year}. Un trimestre o el año
        suman sus meses; deja la celda vacía para quitar la meta.
      </p>
      <div className="-mx-4 overflow-x-auto px-4">
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground">
            <tr>
              <th className="sticky left-0 bg-card py-2 pr-3 text-left font-medium">
                Área
              </th>
              {MONTHS.map((m) => (
                <th key={m} className="px-1 py-2 text-right font-medium">
                  {m}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.areaId ?? "empresa"}
                className="border-t border-border/60"
              >
                <th
                  scope="row"
                  className="sticky left-0 bg-card py-1 pr-3 text-left font-medium"
                >
                  {row.label}
                </th>
                {row.values.map((value, i) => (
                  <td key={MONTHS[i]} className="px-0.5 py-1">
                    <GoalCell
                      key={`${year}-${indicator}`}
                      areaId={row.areaId}
                      indicator={indicator}
                      year={year}
                      month={i + 1}
                      initial={value}
                      label={`Meta de ${row.label} en ${MONTHS[i]} ${year}`}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
