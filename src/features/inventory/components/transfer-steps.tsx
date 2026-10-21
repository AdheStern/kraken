// src/features/inventory/components/transfer-steps.tsx
// Pasos de un traspaso (Borrador → En tránsito → Recibido) con el actual marcado en texto y no solo en color.
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TransferStatusCode } from "../types";

const STEPS = ["Borrador", "En tránsito", "Recibido"] as const;

const REACHED: Record<TransferStatusCode, number> = {
  BORRADOR: 0,
  EN_TRANSITO: 1,
  RECIBIDO_CON_DIFERENCIAS: 1,
  RECIBIDO: 2,
  CANCELADO: 0,
};

export function TransferSteps({ status }: { status: TransferStatusCode }) {
  const reached = REACHED[status];
  return (
    <ol
      className="flex flex-wrap items-center gap-2 text-sm"
      aria-label="Pasos del traspaso"
    >
      {STEPS.map((step, index) => {
        const done = index < reached || status === "RECIBIDO";
        const current = index === reached && status !== "RECIBIDO";
        return (
          <li
            key={step}
            className="flex items-center gap-2"
            aria-current={current ? "step" : undefined}
          >
            {index > 0 && (
              <span className="h-px w-6 bg-border" aria-hidden="true" />
            )}
            <span
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1",
                done && "bg-success/15 text-success",
                current && "bg-primary/10 font-medium text-primary",
                !done && !current && "text-muted-foreground",
              )}
            >
              {done && <Check className="size-3.5" aria-hidden="true" />}
              {step}
              {current &&
                status === "RECIBIDO_CON_DIFERENCIAS" &&
                " · con diferencias"}
              {status === "CANCELADO" && index === 0 && " · cancelado"}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
