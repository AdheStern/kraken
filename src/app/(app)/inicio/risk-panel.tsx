// src/app/(app)/inicio/risk-panel.tsx
// Panel de Inicio con las bolsas en riesgo (consumo alto o vencimiento cercano, §2.4 y §6), con su anillo.
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { expiryText } from "@/features/hours/components/bag-labels";
import {
  bagTone,
  HourBagRing,
} from "@/features/hours/components/hour-bag-ring";
import type { BagSummary } from "@/features/hours/types";
import { formatMinutes } from "@/lib/format-minutes";

const MAX_ITEMS = 4;

export function RiskPanel({ bags }: { bags: BagSummary[] }) {
  return (
    <section
      className="kr-surface flex flex-col rounded-xl"
      aria-labelledby="home-risk"
    >
      <header className="flex items-center justify-between gap-3 px-5 pt-4 pb-2">
        <h2 id="home-risk" className="text-sm font-semibold">
          Bolsas en riesgo
        </h2>
        <Link
          href="/horas"
          className="flex items-center gap-1 text-xs text-primary hover:underline"
        >
          Ver bolsas <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      </header>
      {bags.length === 0 ? (
        <p className="px-5 pb-5 text-sm text-muted-foreground">
          Ninguna bolsa supera el umbral de consumo ni vence pronto.
        </p>
      ) : (
        <ul className="divide-y divide-border/60 px-2 pb-2">
          {bags.slice(0, MAX_ITEMS).map((bag) => (
            <li key={bag.id}>
              <Link
                href={`/horas/${bag.id}`}
                className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] rounded-lg px-3 py-2.5 transition-colors hover:bg-primary/5"
              >
                <HourBagRing
                  pct={bag.consumedPct}
                  status={bag.status}
                  tone={bagTone(bag)}
                />
                <span className="min-w-0">
                  <span className="block truncate font-medium tabular-nums">
                    {bag.cvLabel}
                    <span className="font-normal text-muted-foreground">
                      {" "}
                      · {bag.lineDescription}
                    </span>
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {bag.customerName}
                  </span>
                </span>
                <span className="col-start-2 text-xs tabular-nums sm:col-start-auto sm:text-right">
                  <span className="block font-medium">
                    quedan {formatMinutes(bag.balanceMinutes)}
                  </span>
                  <span
                    className={
                      bag.riskReasons.includes("VENCIMIENTO")
                        ? "text-warning"
                        : "text-muted-foreground"
                    }
                  >
                    {expiryText(bag)}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
