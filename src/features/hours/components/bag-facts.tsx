// src/features/hours/components/bag-facts.tsx
// Franja de cifras de una bolsa: vendidas, consumidas, saldo, vencidas (si hay) y vigencia.
// REGLA: el tiempo se muestra exacto en horas y minutos; nunca se redondea la verdad (PRODUCT.md).
import { formatMinutes } from "@/lib/format-minutes";
import { cn } from "@/lib/utils";
import type { BagSummary } from "../types";
import { expiryText } from "./bag-labels";

export function BagFacts({ bag }: { bag: BagSummary }) {
  const facts = [
    { label: "Vendidas", value: formatMinutes(bag.soldMinutes) },
    { label: "Consumidas", value: formatMinutes(bag.consumedMinutes) },
    { label: "Saldo", value: formatMinutes(bag.balanceMinutes), strong: true },
    ...(bag.expiredMinutes > 0
      ? [{ label: "Vencidas", value: formatMinutes(bag.expiredMinutes) }]
      : []),
    {
      label: "Vigencia",
      value: expiryText(bag),
      warn: bag.riskReasons.includes("VENCIMIENTO"),
    },
  ];
  return (
    <dl className="kr-solid grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-border/70 sm:grid-cols-[repeat(auto-fit,minmax(9rem,1fr))]">
      {facts.map((fact) => (
        <div
          key={fact.label}
          className="flex flex-col gap-1 bg-(--surface-solid) px-4 py-3"
        >
          <dt className="text-xs text-muted-foreground">{fact.label}</dt>
          <dd
            className={cn(
              "tabular-nums",
              fact.strong ? "text-lg font-semibold" : "font-medium",
              fact.warn && "text-warning",
            )}
          >
            {fact.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
