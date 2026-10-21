// src/features/inventory/components/pos-done.tsx
// Confirmación de una salida del POS: su número, el comprobante y la siguiente salida.
import { CircleCheck, FileDown } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";

type Props = { movementId: string; number: number; onRestart: () => void };

export function PosDone({ movementId, number, onRestart }: Props) {
  return (
    <section
      className="kr-solid grid gap-5 rounded-xl p-6 text-center"
      aria-live="polite"
    >
      <CircleCheck
        className="mx-auto size-10 text-success"
        aria-hidden="true"
      />
      <h2 className="text-xl font-semibold">
        Salida N.º <span className="tabular-nums">{number}</span> registrada
      </h2>
      <div className="grid gap-2 sm:grid-cols-2">
        <a
          href={`/api/inventory/receipts/${movementId}.pdf`}
          className={buttonVariants({ variant: "outline", className: "h-12" })}
        >
          <FileDown aria-hidden="true" />
          Descargar comprobante
        </a>
        <Button className="h-12" onClick={onRestart} autoFocus>
          Nueva salida
        </Button>
      </div>
    </section>
  );
}
