// src/features/inventory/components/serial-picker-dialog.tsx
// Al tocar un producto con serial: sus seriales en el almacén como botones de 48 px; se marcan los que salen y se
// confirma. Parte de lo ya elegido, así que también sirve para quitar (AGENTS.md §2.8, una unidad por serial).
"use client";

import { Check } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type SerialPick = {
  code: string;
  description: string;
  serials: readonly string[];
  selected: readonly string[];
};

type Props = {
  pick: SerialPick | null;
  onClose: () => void;
  onConfirm: (serials: string[]) => void;
};

export function SerialPickerDialog({ pick, onClose, onConfirm }: Props) {
  return (
    <Dialog open={pick !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        {pick && (
          <SerialChoices key={pick.code} pick={pick} onConfirm={onConfirm} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function SerialChoices({
  pick,
  onConfirm,
}: {
  pick: SerialPick;
  onConfirm: (serials: string[]) => void;
}) {
  const [chosen, setChosen] = useState<string[]>([...pick.selected]);
  const toggle = (serial: string) =>
    setChosen((current) =>
      current.includes(serial)
        ? current.filter((s) => s !== serial)
        : [...current, serial],
    );
  return (
    <>
      <DialogHeader>
        <DialogTitle>Seriales de {pick.code}</DialogTitle>
        <DialogDescription>
          {pick.description}. Toca cada unidad; también puedes escanear su
          serial.
        </DialogDescription>
      </DialogHeader>
      {pick.serials.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No hay seriales de este producto en el almacén.
        </p>
      ) : (
        <ul className="grid max-h-[50vh] grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
          {pick.serials.map((serial) => {
            const on = chosen.includes(serial);
            return (
              <li key={serial}>
                <Button
                  type="button"
                  variant={on ? "default" : "outline"}
                  aria-pressed={on}
                  className="h-12 w-full justify-between font-mono"
                  onClick={() => toggle(serial)}
                >
                  {serial}
                  {on && <Check aria-hidden="true" />}
                </Button>
              </li>
            );
          })}
        </ul>
      )}
      <DialogFooter>
        <Button className="h-12 w-full" onClick={() => onConfirm(chosen)}>
          {chosen.length === 1
            ? "Listo · 1 unidad"
            : `Listo · ${chosen.length} unidades`}
        </Button>
      </DialogFooter>
    </>
  );
}
