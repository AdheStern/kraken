// src/features/admin/components/fx-today-card.tsx
// TC oficial vigente: venta grande, compra, desde cuándo rige, fuente, variación contra el anterior y aviso
// si no hay uno reciente (AGENTS.md §2.2 panel de TC).
import Decimal from "decimal.js";
import { TriangleAlert } from "lucide-react";
import { KrakenEmpty } from "@/components/brand/kraken-empty";
import type { FxPanel } from "../types";
import { FX_SOURCE_LABELS, formatFxDate } from "./fx-labels";

// POR QUÉ: el TC del viernes rige de sábado a lunes; con más de 2 días sin uno nuevo, algo falló.
const STALE_DAYS = 2;

type Props = Pick<FxPanel, "today" | "current" | "previousSellRate">;

export function FxTodayCard({ today, current, previousSellRate }: Props) {
  if (!current)
    return (
      <KrakenEmpty compact title="Todavía no hay un tipo de cambio cargado.">
        El job lo trae del BCB cada noche; mientras tanto, cárgalo a mano con el
        formulario de abajo para que los CV nuevos guarden su TC de referencia.
      </KrakenEmpty>
    );
  const delta = previousSellRate
    ? new Decimal(current.sellRate).minus(previousSellRate)
    : null;
  const ageDays =
    (Date.parse(today) - Date.parse(current.effectiveOn)) / 86_400_000;
  return (
    <div className="kr-surface grid gap-4 rounded-xl p-5">
      <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
        <div>
          <p className="text-sm text-muted-foreground">Venta</p>
          <p className="text-4xl font-semibold tabular-nums tracking-tight">
            {current.sellRate}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Compra</p>
          <p className="text-2xl font-medium tabular-nums">{current.buyRate}</p>
        </div>
        <div className="text-sm">
          <p className="text-muted-foreground">Variación</p>
          <p className="tabular-nums">
            {delta === null
              ? "Sin dato anterior"
              : delta.isZero()
                ? "Sin cambio"
                : `${delta.gt(0) ? "+" : ""}${delta.toFixed(Math.max(2, delta.decimalPlaces()))}`}
          </p>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        Rige desde el {formatFxDate(current.effectiveOn)} ·{" "}
        {FX_SOURCE_LABELS[current.source]}
      </p>
      {ageDays > STALE_DAYS && (
        <p className="flex items-start gap-2 text-sm text-warning">
          <TriangleAlert
            className="mt-0.5 size-4 shrink-0"
            aria-hidden="true"
          />
          No hay un TC más reciente desde el {formatFxDate(current.effectiveOn)}
          . Si no es feriado, revisa el job del tipo de cambio o cárgalo a mano.
        </p>
      )}
    </div>
  );
}
