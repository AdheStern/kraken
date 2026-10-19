// src/features/tickets/components/bag-hierarchy-editor.tsx
// Jerarquía de bolsas del ticket: se arrastra o se mueve con los botones (teclado), se suman bolsas elegibles y
// se guarda el orden; el cierre llena la prioridad 1, luego la 2… (AGENTS.md §2.6).
"use client";

import { ArrowDown, ArrowUp, LoaderCircle, X } from "lucide-react";
import { MotionConfig, Reorder } from "motion/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { OptionSelect } from "@/components/ui/option-select";
import type { BagSummary } from "@/features/hours/types";
import { setTicketBags } from "../actions/set-ticket-bags";
import type { TicketBagView } from "../types";
import { BagHierarchyRow } from "./bag-hierarchy-row";
import { useTicketAction } from "./use-ticket-action";

type Props = {
  ticketId: string;
  hierarchy: TicketBagView[];
  eligible: BagSummary[];
  canManage: boolean;
};

const EASE = [0.16, 1, 0.3, 1] as const;

export function BagHierarchyEditor({
  ticketId,
  hierarchy,
  eligible,
  canManage,
}: Props) {
  const saved = hierarchy.map((h) => h.bag.id);
  const [order, setOrder] = useState(saved);
  const { run, isPending, error } = useTicketAction();
  const byId = new Map<string, BagSummary>([
    ...hierarchy.map((h) => [h.bag.id, h.bag] as const),
    ...eligible.map((b) => [b.id, b] as const),
  ]);
  const projected = new Map(
    hierarchy.map((h) => [h.bag.id, h.projectedMinutes]),
  );
  const isDirty = order.join() !== saved.join();
  const addable = eligible.filter((b) => !order.includes(b.id));
  const move = (index: number, delta: number) => {
    const next = [...order];
    [next[index], next[index + delta]] = [next[index + delta], next[index]];
    setOrder(next);
  };

  return (
    <div className="flex flex-col gap-3">
      {order.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Sin bolsas. Suma las bolsas del cliente que cubren este trabajo; sin
          ellas, las horas quedan pendientes al cerrar.
        </p>
      ) : (
        <MotionConfig
          reducedMotion="user"
          transition={{ duration: 0.22, ease: EASE }}
        >
          <Reorder.Group
            axis="y"
            values={order}
            onReorder={canManage ? setOrder : () => {}}
            className="kr-solid divide-y divide-border/60 rounded-xl"
          >
            {order.map((id, index) => {
              const bag = byId.get(id);
              if (!bag) return null;
              return (
                <Reorder.Item
                  key={id}
                  value={id}
                  drag={canManage}
                  className="bg-transparent"
                >
                  <BagHierarchyRow
                    priority={index + 1}
                    bag={bag}
                    projectedMinutes={isDirty ? null : (projected.get(id) ?? 0)}
                  >
                    {canManage && (
                      <span className="flex shrink-0 gap-0.5">
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          aria-label={`Subir ${bag.cvLabel}`}
                          disabled={index === 0}
                          onClick={() => move(index, -1)}
                        >
                          <ArrowUp aria-hidden="true" />
                        </Button>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          aria-label={`Bajar ${bag.cvLabel}`}
                          disabled={index === order.length - 1}
                          onClick={() => move(index, 1)}
                        >
                          <ArrowDown aria-hidden="true" />
                        </Button>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          aria-label={`Quitar ${bag.cvLabel}`}
                          onClick={() =>
                            setOrder(order.filter((o) => o !== id))
                          }
                        >
                          <X aria-hidden="true" />
                        </Button>
                      </span>
                    )}
                  </BagHierarchyRow>
                </Reorder.Item>
              );
            })}
          </Reorder.Group>
        </MotionConfig>
      )}
      {canManage && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          {addable.length > 0 ? (
            <OptionSelect
              aria-label="Sumar una bolsa"
              className="h-9 sm:w-80"
              value={null}
              placeholder="Sumar una bolsa del cliente…"
              options={addable.map((b) => ({
                id: b.id,
                label: `${b.cvLabel} · ${b.lineDescription}`,
              }))}
              onValueChange={(id) => id && setOrder([...order, id])}
            />
          ) : (
            <span className="text-xs text-muted-foreground">
              No hay más bolsas activas del cliente que cubran este ticket.
            </span>
          )}
          {isDirty && (
            <span className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setOrder(saved)}
                disabled={isPending}
              >
                Descartar
              </Button>
              <Button
                size="sm"
                disabled={isPending}
                onClick={() =>
                  run(() => setTicketBags({ ticketId, bagIds: order }))
                }
              >
                {isPending && (
                  <LoaderCircle className="animate-spin" aria-hidden="true" />
                )}
                Guardar orden
              </Button>
            </span>
          )}
        </div>
      )}
      {error && (
        <p
          role="alert"
          className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      )}
    </div>
  );
}
