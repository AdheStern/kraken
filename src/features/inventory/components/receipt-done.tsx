// src/features/inventory/components/receipt-done.tsx
// Confirmación de un ingreso registrado: su número, los productos que se crearon para revisión y qué hacer después.
import { CircleCheck } from "lucide-react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";

type Props = {
  number: number;
  createdProducts: string[];
  warehouse: { code: string; name: string };
  onRestart: () => void;
};

export function ReceiptDone({
  number,
  createdProducts,
  warehouse,
  onRestart,
}: Props) {
  return (
    <section className="kr-solid grid gap-4 rounded-xl p-6" aria-live="polite">
      <div className="flex items-start gap-3">
        <CircleCheck
          className="mt-0.5 size-5 shrink-0 text-success"
          aria-hidden="true"
        />
        <div className="grid gap-1">
          <h2 className="font-semibold">
            Ingreso N.º <span className="tabular-nums">{number}</span>{" "}
            registrado en {warehouse.name}.
          </h2>
          {createdProducts.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Se{" "}
              {createdProducts.length === 1
                ? "creó un producto nuevo"
                : `crearon ${createdProducts.length} productos nuevos`}{" "}
              que Administración revisará:{" "}
              <span className="font-mono">{createdProducts.join(", ")}</span>.
            </p>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link
          href={`/inventario?almacen=${encodeURIComponent(warehouse.code)}`}
          className={buttonVariants({ variant: "outline" })}
        >
          Ver el stock
        </Link>
        <Button onClick={onRestart}>Registrar otro ingreso</Button>
      </div>
    </section>
  );
}
