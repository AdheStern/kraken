// src/features/inventory/components/pos-cart-list.tsx
// Carrito del POS con cifras grandes y objetivos táctiles de 48 px: cantidad con − y +, o los seriales escaneados
// con su botón para quitarlos (AGENTS.md §5 "POS interno: una sola columna, pensado para tablet").
"use client";

import { Minus, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatQuantity } from "./inventory-labels";
import { type CartLine, lineQuantity } from "./pos-cart";

type Props = { cart: CartLine[]; onChange: (cart: CartLine[]) => void };

export function PosCartList({ cart, onChange }: Props) {
  const replace = (line: CartLine, next: CartLine | null) =>
    onChange(
      next && lineQuantity(next) > 0
        ? cart.map((l) => (l === line ? next : l))
        : cart.filter((l) => l !== line),
    );
  return (
    <ul className="kr-solid divide-y divide-border/60 rounded-xl">
      {cart.map((line) => (
        <li
          key={line.item.productId}
          className="grid gap-2 px-4 py-3 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-top-1"
        >
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-mono text-sm font-medium">{line.item.code}</p>
              <p className="truncate text-sm text-muted-foreground">
                {line.item.description} · disponibles{" "}
                {formatQuantity(line.item.availableQuantity)}
              </p>
            </div>
            <span className="text-3xl font-semibold tabular-nums">
              {lineQuantity(line)}
            </span>
          </div>
          {line.item.isSerialized ? (
            <ul className="flex flex-wrap gap-2">
              {line.serials.map((serial) => (
                <li key={serial}>
                  <Button
                    variant="outline"
                    className="h-12 font-mono"
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
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="size-12"
                aria-label={`Una menos de ${line.item.code}`}
                onClick={() =>
                  replace(line, { ...line, quantity: line.quantity - 1 })
                }
              >
                <Minus aria-hidden="true" />
              </Button>
              <Button
                variant="outline"
                className="size-12"
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
