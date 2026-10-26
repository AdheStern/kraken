// src/features/inventory/components/inventory-actions.tsx
// Accesos del inventario según lo que el usuario puede hacer (AGENTS.md §2.9): traspasos, ajustes, conteo, POS,
// devoluciones e ingresos; en TRANSITO no hay salidas, devoluciones ni ingresos.
import {
  ArrowLeftRight,
  ClipboardCheck,
  PackagePlus,
  ScaleIcon,
  ScanLine,
  Undo2,
} from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

type Props = {
  warehouseCode: string;
  isTransit: boolean;
  canOperate: boolean;
  canDecide: boolean;
};

export function InventoryActions({
  warehouseCode,
  isTransit,
  canOperate,
  canDecide,
}: Props) {
  const code = encodeURIComponent(warehouseCode);
  const outline = buttonVariants({ variant: "outline" });
  return (
    <div className="flex flex-wrap gap-2">
      {canOperate && (
        <Link href="/inventario/traspasos" className={outline}>
          <ArrowLeftRight aria-hidden="true" />
          Traspasos
        </Link>
      )}
      {(canOperate || canDecide) && (
        <Link href="/inventario/ajustes" className={outline}>
          <ScaleIcon aria-hidden="true" />
          Ajustes
        </Link>
      )}
      {canOperate && !isTransit && (
        <>
          <Link href={`/inventario/conteo?almacen=${code}`} className={outline}>
            <ClipboardCheck aria-hidden="true" />
            Conteo
          </Link>
          <Link href={`/inventario/pos?almacen=${code}`} className={outline}>
            <ScanLine aria-hidden="true" />
            POS
          </Link>
          <Link href="/inventario/devoluciones/nueva" className={outline}>
            <Undo2 aria-hidden="true" />
            Devolución
          </Link>
          <Link
            href={`/inventario/ingresos/nuevo?almacen=${code}`}
            className={buttonVariants()}
          >
            <PackagePlus aria-hidden="true" />
            Registrar ingreso
          </Link>
        </>
      )}
    </div>
  );
}
