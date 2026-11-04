// src/features/inventory/components/cart-tiles.tsx
// Lo que lleva la operación (salida, traspaso) como tarjetas, con cifras grandes y objetivos táctiles de 48 px:
// cantidad con − y +, o los seriales con su botón para quitarlos (AGENTS.md §5 "POS interno", pensado para tablet).
"use client";

import { Minus, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatQuantity } from "./inventory-labels";
import { type CartLine, lineQuantity } from "./pos-cart";

type Props = { cart: CartLine[]; onChange: (cart: CartLine[]) => void };

export function CartTiles({ cart, onChange }: Props) {
  const replace = (line: CartLine, next: CartLine | null) =>
    onChange(
      next && lineQuantity(next) > 0
        ? cart.map((l) => (l === line ? next : l))
        : cart.filter((l) => l !== line),
    );
  if (cart.length === 0)
    return (
      <p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
        Toca un producto o escanea su código para agregarlo.
      </p>
    );
  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2">
      {cart.map((line) => (
        <li
          key={line.item.productId}
          className="grid content-start gap-2 rounded-xl border bg-background/40 p-3 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-mono text-sm font-medium">
                {line.item.code}
              </p>
              <p className="text-xs text-muted-foreground">
                disp. {formatQuantity(line.item.availableQuantity)}
              </p>
            </div>
            <span className="text-3xl leading-none font-semibold tabular-nums">
              {lineQuantity(line)}
            </span>
          </div>
          {line.item.isSerialized ? (
            <ul className="grid gap-1.5">
              {line.serials.map((serial) => (
                <li key={serial}>
                  <Button
                    variant="outline"
                    className="h-12 w-full justify-between font-mono"
                    aria-label={`Quitar el serial ${serial}`}
                    onClick={() =>
                      replace(line, {
                        ...line,
                        serials: line.serials.filter((s) => s !== serial),
                      })
                    }
                  >
                    {serial}
                    <X aria-hidden="true" />
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="h-12"
                aria-label={`Una menos de ${line.item.code}`}
                onClick={() =>
                  replace(line, { ...line, quantity: line.quantity - 1 })
                }
              >
                <Minus aria-hidden="true" />
              </Button>
              <Button
                variant="outline"
                className="h-12"
                aria-label={`Una más de ${line.item.code}`}
                onClick={() =>
                  replace(line, { ...line, quantity: line.quantity + 1 })
                }
              >
                <Plus aria-hidden="true" />
              </Button>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
