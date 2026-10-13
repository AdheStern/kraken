// src/features/hours/components/bag-card.tsx
// Tarjeta de una bolsa en la vista del cliente: anillo de módulo con el % al centro, CV, modalidad, alcance,
// saldo sobre lo vendido y vencimiento (AGENTS.md §5, "Bolsas de un cliente").
import Link from "next/link";
import { formatMinutes } from "@/lib/format-minutes";
import { cn } from "@/lib/utils";
import type { BagSummary } from "../types";
import { expiryText, MODALITY_LABELS, scopeText } from "./bag-labels";
import { BagStatusBadge } from "./bag-status-badge";
import { bagTone, HourBagRing } from "./hour-bag-ring";

export function BagCard({ bag }: { bag: BagSummary }) {
  const isEnded = bag.status === "VENCIDA" || bag.status === "CERRADA";
  return (
    <li
      className={cn(
        "relative flex flex-col gap-4 rounded-xl border bg-card p-5 transition-colors hover:border-ring/50",
        isEnded && "bg-muted/30",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="relative grid size-[76px] shrink-0 place-items-center">
          <HourBagRing
            pct={bag.consumedPct}
            status={bag.status}
            tone={bagTone(bag)}
            size="lg"
            className="absolute inset-0"
          />
          <span className="text-lg font-semibold tabular-nums">
            {bag.consumedPct}%
          </span>
        </div>
        {bag.status !== "ACTIVA" && <BagStatusBadge status={bag.status} />}
      </div>
      <div className="min-w-0">
        <Link
          href={`/horas/${bag.id}`}
          className="font-semibold tabular-nums after:absolute after:inset-0 hover:underline"
        >
          {bag.cvLabel}
        </Link>
        <p className="truncate text-sm text-muted-foreground">
          {bag.lineDescription}
        </p>
      </div>
      <dl className="grid gap-1 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Saldo</dt>
          <dd className="text-right tabular-nums">
            <span className="font-medium">
              {formatMinutes(bag.balanceMinutes)}
            </span>
            <span className="text-muted-foreground">
              {" "}
              de {formatMinutes(bag.soldMinutes)}
            </span>
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Modalidad</dt>
          <dd className="truncate text-right">
            {MODALITY_LABELS[bag.modality]} · {scopeText(bag)}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Vigencia</dt>
          <dd
            className={cn(
              "text-right",
              bag.riskReasons.includes("VENCIMIENTO") &&
                "font-medium text-warning",
            )}
          >
            {expiryText(bag)}
          </dd>
        </div>
      </dl>
    </li>
  );
}
