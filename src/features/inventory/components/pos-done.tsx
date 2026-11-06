// src/features/inventory/components/pos-done.tsx
// Confirmación de una salida del POS o de una devolución: su número, el comprobante (y el acta de entrega si fue
// a un CV) y la siguiente.
import { CircleCheck, FileDown } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";

type Props = {
  movementId: string;
  number: number;
  onRestart: () => void;
  title?: string;
  restartLabel?: string;
  withDeliveryNote?: boolean;
};

export function PosDone({
  movementId,
  number,
  onRestart,
  title = "Salida",
  restartLabel = "Nueva salida",
  withDeliveryNote = false,
}: Props) {
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
        {title} N.º <span className="tabular-nums">{number}</span> registrada
      </h2>
      <div className="grid gap-2 sm:grid-cols-2">
        <a
          href={`/api/inventory/receipts/${movementId}.pdf`}
          className={buttonVariants({ variant: "outline", className: "h-12" })}
        >
          <FileDown aria-hidden="true" />
          Descargar comprobante
        </a>
        {withDeliveryNote && (
          <a
            href={`/api/inventory/receipts/${movementId}.pdf?acta=1`}
            className={buttonVariants({
              variant: "outline",
              className: "h-12 sm:col-span-2 sm:order-first",
            })}
          >
            <FileDown aria-hidden="true" />
            Descargar acta de entrega
          </a>
        )}
        <Button className="h-12" onClick={onRestart} autoFocus>
          {restartLabel}
        </Button>
      </div>
    </section>
  );
}
