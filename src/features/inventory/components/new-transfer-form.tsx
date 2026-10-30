// src/features/inventory/components/new-transfer-form.tsx
// Alta de un traspaso: origen y destino, lo que viaja escaneado o buscado como en el POS (con sus seriales) y
// notas; se guarda como borrador o se envía de una vez (AGENTS.md §2.8).
"use client";

import { LoaderCircle, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMarkCreated } from "@/components/forms/fresh-after-create";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OptionSelect } from "@/components/ui/option-select";
import { createTransfer } from "../actions/create-transfer";
import { sendTransfer } from "../actions/send-transfer";
import type { PosCatalogItem, WarehouseTab } from "../types";
import { applyScan, type CartLine, lineQuantity } from "./pos-cart";
import { PosCartList } from "./pos-cart-list";
import { PosScanner } from "./pos-scanner";

type Props = {
  warehouses: WarehouseTab[];
  origin: WarehouseTab;
  catalog: PosCatalogItem[];
};

export function NewTransferForm({ warehouses, origin, catalog }: Props) {
  const router = useRouter();
  const markCreated = useMarkCreated();
  const [destinationId, setDestinationId] = useState<string | null>(
    warehouses.find((w) => w.id !== origin.id)?.id ?? null,
  );
  const [cart, setCart] = useState<CartLine[]>([]);
  const [notes, setNotes] = useState("");
  const [pending, setPending] = useState<"draft" | "send" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const options = (exclude: string | null) =>
    warehouses
      .filter((w) => w.id !== exclude)
      .map((w) => ({ id: w.id, label: w.name }));

  function onScan(text: string) {
    const result = applyScan(cart, catalog, text);
    if (result.ok) setCart(result.cart);
    return result;
  }

  async function save(send: boolean) {
    if (!destinationId) return setError("Elige el almacén de destino.");
    setPending(send ? "send" : "draft");
    setError(null);
    const created = await createTransfer({
      originWarehouseId: origin.id,
      destinationWarehouseId: destinationId,
      notes,
      lines: cart.map((l) => ({
        productId: l.item.productId,
        quantity: String(lineQuantity(l)),
        serials: l.serials,
      })),
    });
    const sent =
      created.ok && send
        ? await sendTransfer({ transferId: created.data.transferId })
        : null;
    setPending(null);
    if (!created.ok) return setError(created.error.message);
    if (sent && !sent.ok) setError(`Quedó en borrador: ${sent.error.message}`);
    markCreated();
    router.push(`/inventario/traspasos/${created.data.transferId}`);
  }

  return (
    <div className="mx-auto grid w-full max-w-xl gap-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label className="text-xs text-muted-foreground">Desde</Label>
          <OptionSelect
            aria-label="Almacén de origen"
            value={origin.id}
            options={options(null)}
            onValueChange={(id) => {
              const code = warehouses.find((w) => w.id === id)?.code;
              if (code)
                router.push(
                  `/inventario/traspasos/nuevo?origen=${encodeURIComponent(code)}`,
                );
            }}
            className="h-12 w-full"
          />
        </div>
        <div className="grid gap-1.5">
          <Label className="text-xs text-muted-foreground">Hacia</Label>
          <OptionSelect
            aria-label="Almacén de destino"
            value={destinationId}
            options={options(origin.id)}
            onValueChange={setDestinationId}
            className="h-12 w-full"
          />
        </div>
      </div>
      <PosScanner onScan={onScan} />
      {cart.length > 0 && <PosCartList cart={cart} onChange={setCart} />}
      <Input
        value={notes}
        placeholder="Notas (opcional)"
        aria-label="Notas"
        className="h-12"
        onChange={(e) => setNotes(e.target.value)}
      />
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        <Button
          variant="outline"
          className="h-12"
          disabled={cart.length === 0 || pending !== null}
          onClick={() => save(false)}
        >
          {pending === "draft" && (
            <LoaderCircle className="animate-spin" aria-hidden="true" />
          )}
          Guardar borrador
        </Button>
        <Button
          className="h-12"
          disabled={cart.length === 0 || pending !== null}
          onClick={() => save(true)}
        >
          {pending === "send" ? (
            <LoaderCircle className="animate-spin" aria-hidden="true" />
          ) : (
            <Send aria-hidden="true" />
          )}
          Crear y enviar
        </Button>
      </div>
    </div>
  );
}
