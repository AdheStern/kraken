// src/features/hours/components/bag-card.tsx
// Tarjeta de una bolsa en la vista del cliente: anillo de módulo con el % al centro, CV, modalidad, alcance,
// saldo sobre lo vendido (o lo usado de un contrato sin tope) y vigencia (AGENTS.md §2.4, §5).
import Link from "next/link";
import { CountUp } from "@/components/motion/count-up";
import { cn } from "@/lib/utils";
import type { BagSummary } from "../types";
import {
  balanceText,
  expiryText,
  kindText,
  MODALITY_LABELS,
  scopeText,
} from "./bag-labels";
import { BagStatusBadge } from "./bag-status-badge";
import { bagTone, HourBagRing } from "./hour-bag-ring";

export function BagCard({ bag }: { bag: BagSummary }) {
  const isEnded = bag.status === "VENCIDA" || bag.status === "CERRADA";
  return (
    <li
      className={cn(
        "kr-surface kr-lift relative flex flex-col gap-4 rounded-xl p-5",
        isEnded && "opacity-80",
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
          {bag.isUncapped ? (
            <span className="text-center text-xs font-medium leading-tight">
              Sin
              <br />
              tope
            </span>
          ) : (
            <span className="text-lg font-semibold tabular-nums">
              <CountUp value={bag.consumedPct} />%
            </span>
          )}
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
        {kindText(bag) && (
          <p className="text-xs font-medium text-primary">{kindText(bag)}</p>
        )}
      </div>
      <dl className="grid gap-1 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">
            {bag.isUncapped ? "Uso" : "Saldo"}
          </dt>
          <dd className="text-right font-medium tabular-nums">
            {balanceText(bag)}
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
