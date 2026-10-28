// src/features/tickets/components/bag-hierarchy-row.tsx
// Una bolsa de la jerarquía: prioridad, anillo de consumo, CV, modalidad, saldo y consumo proyectado del ticket.
import Link from "next/link";
import type { ReactNode } from "react";
import {
  bagTone,
  HourBagRing,
} from "@/features/hours/components/hour-bag-ring";
import type { BagSummary } from "@/features/hours/types";
import { formatMinutes } from "@/lib/format-minutes";
import { MODALITY_LABELS } from "../ticket-labels";

type Props = {
  priority: number;
  bag: BagSummary;
  // POR QUÉ: null mientras hay un orden sin guardar; la proyección es la del orden guardado.
  projectedMinutes: number | null;
  children?: ReactNode;
};

export function BagHierarchyRow({
  priority,
  bag,
  projectedMinutes,
  children,
}: Props) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="w-5 shrink-0 text-center text-sm font-semibold tabular-nums text-muted-foreground">
        {priority}
      </span>
      <HourBagRing
        pct={bag.consumedPct}
        status={bag.status}
        tone={bagTone(bag)}
      />
      <div className="min-w-0 flex-1">
        <Link
          href={`/horas/${bag.id}`}
          className="text-sm font-medium tabular-nums hover:underline"
        >
          {bag.cvLabel}
        </Link>
        <p className="truncate text-xs text-muted-foreground">
          {MODALITY_LABELS[bag.modality]} · {bag.lineDescription}
        </p>
      </div>
      <dl className="hidden shrink-0 text-right text-xs sm:block">
        <dt className="sr-only">Saldo</dt>
        <dd className="tabular-nums">
          {bag.isUncapped ? (
            <span className="text-muted-foreground">
              Contrato · {formatMinutes(bag.consumedMinutes)} usadas · sin tope
            </span>
          ) : (
            <>
              <span className="font-medium">
                {formatMinutes(bag.balanceMinutes)}
              </span>
              <span className="text-muted-foreground">
                {" "}
                · {bag.consumedPct}% usado
              </span>
            </>
          )}
        </dd>
        {projectedMinutes !== null && projectedMinutes > 0 && (
          <>
            <dt className="sr-only">Consumo proyectado</dt>
            <dd className="tabular-nums text-muted-foreground">
              −{formatMinutes(projectedMinutes)} proyectado
            </dd>
          </>
        )}
      </dl>
      {children}
    </div>
  );
}
