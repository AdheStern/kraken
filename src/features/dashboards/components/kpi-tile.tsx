// src/features/dashboards/components/kpi-tile.tsx
// Cifra clave de un tablero: valor exacto, variación contra el periodo anterior y avance de la meta (AGENTS.md
// §6). El color va solo en la flecha y la barra; el texto sigue en tinta (nunca solo color).
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export type KpiTileProps = {
  label: string;
  value: string;
  hint?: string;
  variation?: { pct: number | null; versus: string; upIsGood?: boolean };
  goal?: { progressPct: number | null; text: string };
};

const pctText = (pct: number) =>
  `${pct > 0 ? "+" : pct < 0 ? "−" : ""}${Math.abs(pct).toLocaleString("es-BO")}%`;

export function KpiTile({ label, value, hint, variation, goal }: KpiTileProps) {
  return (
    <div className="kr-solid flex min-w-0 flex-col gap-2 rounded-xl p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="truncate text-2xl font-semibold tracking-[-0.02em]">
        {value}
      </p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {variation && <Variation {...variation} />}
      {goal && <GoalMeter {...goal} />}
    </div>
  );
}

function Variation({
  pct,
  versus,
  upIsGood = true,
}: NonNullable<KpiTileProps["variation"]>) {
  if (pct === null)
    return (
      <p className="text-xs text-muted-foreground">Sin base en {versus}</p>
    );
  const Icon = pct > 0 ? ArrowUpRight : pct < 0 ? ArrowDownRight : Minus;
  const isGood = pct === 0 ? null : pct > 0 === upIsGood;
  return (
    <p className="flex items-center gap-1 text-xs text-muted-foreground">
      <Icon
        aria-hidden="true"
        className={cn(
          "size-3.5",
          isGood === true && "text-success",
          isGood === false && "text-destructive",
        )}
      />
      <span className="font-medium text-foreground tabular-nums">
        {pctText(pct)}
      </span>
      vs {versus}
    </p>
  );
}

function GoalMeter({ progressPct, text }: NonNullable<KpiTileProps["goal"]>) {
  if (progressPct === null)
    return <p className="text-xs text-muted-foreground">{text}</p>;
  return (
    <div className="flex flex-col gap-1">
      {/* POR QUÉ: la barra es visual; el texto de abajo ya dice el avance a los lectores de pantalla. */}
      <div
        className="h-1.5 overflow-hidden rounded-full bg-primary/15"
        aria-hidden="true"
      >
        <div
          className={cn(
            "h-full rounded-full bg-primary",
            progressPct >= 100 && "bg-success",
          )}
          style={{ width: `${Math.min(progressPct, 100)}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">{text}</p>
    </div>
  );
}
