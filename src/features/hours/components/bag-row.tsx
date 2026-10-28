// src/features/hours/components/bag-row.tsx
// Fila de una bolsa en el seguimiento: anillo satélite, CV y línea, cliente, modalidad y alcance, consumo,
// saldo y vencimiento. Toda la fila abre el libro de la bolsa.
import Link from "next/link";
import { formatMinutes } from "@/lib/format-minutes";
import { cn } from "@/lib/utils";
import type { BagSummary } from "../types";
import { expiryText, kindText, MODALITY_LABELS, scopeText } from "./bag-labels";
import { BagStatusBadge } from "./bag-status-badge";
import { bagTone, HourBagRing } from "./hour-bag-ring";

export function BagRow({ bag }: { bag: BagSummary }) {
  const isEnded = bag.status === "VENCIDA" || bag.status === "CERRADA";
  const expiresSoon = bag.riskReasons.includes("VENCIMIENTO");
  return (
    <li
      className={cn(
        "relative grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 px-4 py-3 transition-colors hover:bg-muted/40 md:grid-cols-[auto_minmax(0,1.6fr)_minmax(0,1fr)_10.5rem_11.5rem] md:items-center",
        isEnded && "text-muted-foreground",
      )}
    >
      <HourBagRing
        pct={bag.consumedPct}
        status={bag.status}
        tone={bagTone(bag)}
        className="row-span-3 mt-0.5 md:row-span-1 md:mt-0"
      />
      <div className="min-w-0">
        {/* POR QUÉ: una descripción larga no debe empujar la fila; el texto completo queda en el title. */}
        <p className="line-clamp-2 md:line-clamp-1" title={bag.lineDescription}>
          <Link
            href={`/horas/${bag.id}`}
            className="font-medium tabular-nums after:absolute after:inset-0 hover:underline"
          >
            {bag.cvLabel}
          </Link>
          <span className="text-muted-foreground">
            {" "}
            · {bag.lineDescription}
          </span>
        </p>
        <p className="truncate text-sm text-muted-foreground">
          <Link
            href={`/horas/clientes/${bag.customerId}`}
            className="relative z-10 hover:text-foreground hover:underline"
          >
            {bag.customerName}
          </Link>
        </p>
      </div>
      <p className="truncate text-sm text-muted-foreground">
        {kindText(bag) && <>{kindText(bag)} · </>}
        {MODALITY_LABELS[bag.modality]} · {scopeText(bag)}
      </p>
      <p className="text-sm tabular-nums md:text-right md:whitespace-nowrap">
        {isEnded || bag.status === "AGOTADA" ? (
          <BagStatusBadge status={bag.status} />
        ) : bag.isUncapped ? (
          <span className="text-muted-foreground">
            {formatMinutes(bag.consumedMinutes)} usadas · sin tope
          </span>
        ) : (
          <>
            <span className="font-medium">{bag.consumedPct}%</span>
            <span className="text-muted-foreground">
              {" "}
              · quedan {formatMinutes(bag.balanceMinutes)}
            </span>
          </>
        )}
      </p>
      <p
        className={cn(
          "col-start-2 text-sm md:col-start-auto md:text-right md:whitespace-nowrap",
          expiresSoon ? "font-medium text-warning" : "text-muted-foreground",
        )}
      >
        {expiryText(bag)}
      </p>
    </li>
  );
}
