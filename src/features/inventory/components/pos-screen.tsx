// src/features/inventory/components/pos-screen.tsx
// POS interno para tablet (AGENTS.md §2.8, §5): almacén → tocar o escanear los productos → salida → destino →
// confirmar → comprobante. Como un POS de supermercado: mosaicos a la izquierda y la salida en el panel.
"use client";

import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useMarkCreated } from "@/components/forms/fresh-after-create";
import { useShortcuts } from "@/components/shortcuts/use-shortcuts";
import { Button } from "@/components/ui/button";
import { OptionSelect } from "@/components/ui/option-select";
import { dispatchItems } from "../actions/dispatch-items";
import type {
  PendingReservation,
  PosCatalogItem,
  WarehouseTab,
} from "../types";
import { CartTiles } from "./cart-tiles";
import { type CartLine, lineQuantity } from "./pos-cart";
import { type PosDestination, PosDestinationPicker } from "./pos-destination";
import { PosDone } from "./pos-done";
import { PosProductPicker } from "./pos-product-picker";
import { PosWorkspace } from "./pos-workspace";

const STORED_WAREHOUSE = "kraken.pos.almacen";

type Props = {
  warehouses: WarehouseTab[];
  warehouse: WarehouseTab;
  catalog: PosCatalogItem[];
  reservations: PendingReservation[];
  isDefaultWarehouse: boolean;
};

export function PosScreen({
  warehouses,
  warehouse,
  catalog,
  reservations,
  isDefaultWarehouse,
}: Props) {
  const router = useRouter();
  const markCreated = useMarkCreated();
  const [cart, setCart] = useState<CartLine[]>([]);
  const [destination, setDestination] = useState<PosDestination>({
    kind: "CV",
    reservationId: null,
  });
  const [idempotencyKey, setIdempotencyKey] = useState(() =>
    crypto.randomUUID(),
  );
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{
    movementId: string;
    number: number;
  } | null>(null);

  // POR QUÉ: la tablet recuerda su almacén (preferencia por navegador); si falla el almacenamiento, se ignora.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORED_WAREHOUSE);
      if (
        isDefaultWarehouse &&
        stored &&
        stored !== warehouse.code &&
        warehouses.some((w) => w.code === stored)
      )
        router.replace(`/inventario/pos?almacen=${encodeURIComponent(stored)}`);
      else localStorage.setItem(STORED_WAREHOUSE, warehouse.code);
    } catch {}
  }, [isDefaultWarehouse, router, warehouse.code, warehouses]);

  const products = new Set(cart.map((l) => l.item.productId));
  const visibleReservations = reservations.filter(
    (r) => products.size === 1 && products.has(r.productId),
  );
  const canConfirm = cart.length > 0 && isReady(destination) && !isPending;
  useShortcuts({
    "inv.confirm": () => !done && canConfirm && void confirm(),
  });

  async function confirm() {
    setIsPending(true);
    setError(null);
    const result = await dispatchItems({
      warehouseId: warehouse.id,
      destination: toPayload(destination),
      notes: "",
      idempotencyKey,
      lines: cart.map((l) => ({
        productId: l.item.productId,
        quantity: String(lineQuantity(l)),
        serials: l.serials,
      })),
    });
    setIsPending(false);
    if (!result.ok) return setError(result.error.message);
    markCreated();
    setDone(result.data);
    router.refresh();
  }

  function restart() {
    setCart([]);
    setDestination({ kind: "CV", reservationId: null });
    setIdempotencyKey(crypto.randomUUID());
    setDone(null);
  }

  if (done)
    return (
      <PosDone
        {...done}
        onRestart={restart}
        withDeliveryNote={destination.kind === "CV"}
      />
    );
  const units = cart.reduce((sum, l) => sum + lineQuantity(l), 0);

  return (
    <PosWorkspace
      title="Salida"
      summary={units === 1 ? "1 artículo" : `${units} artículos`}
      products={
        <>
          <OptionSelect
            aria-label="Almacén"
            value={warehouse.code}
            options={warehouses.map((w) => ({ id: w.code, label: w.name }))}
            onValueChange={(code) =>
              code &&
              router.push(`/inventario/pos?almacen=${encodeURIComponent(code)}`)
            }
            className="h-12 w-full text-base"
          />
          <PosProductPicker catalog={catalog} cart={cart} onChange={setCart} />
        </>
      }
      panel={
        <>
          <CartTiles cart={cart} onChange={setCart} />
          {cart.length > 0 && (
            <PosDestinationPicker
              value={destination}
              reservations={visibleReservations}
              onChange={setDestination}
            />
          )}
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button
            className="h-14 text-base"
            disabled={!canConfirm}
            onClick={confirm}
          >
            {isPending && (
              <LoaderCircle className="animate-spin" aria-hidden="true" />
            )}
            Confirmar salida
          </Button>
        </>
      }
    />
  );
}

function isReady(d: PosDestination): boolean {
  if (d.kind === "CV") return d.reservationId !== null;
  if (d.kind === "TICKET") return d.ticket !== null;
  return d.reason.trim().length >= 5;
}

function toPayload(d: PosDestination) {
  if (d.kind === "CV")
    return { kind: "CV" as const, reservationId: d.reservationId ?? "" };
  if (d.kind === "TICKET")
    return { kind: "TICKET" as const, ticketId: d.ticket?.id ?? "" };
  return { kind: "INTERNO" as const, reason: d.reason };
}
