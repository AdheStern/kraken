// src/features/sales-control/components/opening-balance-field.tsx
// Casilla "CV de saldo inicial" del alta de CV: traslada horas vigentes antes de Kraken (AGENTS.md §14, F2).
"use client";

import { type Control, Controller } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { CreateCvInput } from "../schemas/create-cv-schema";

export function OpeningBalanceField({
  control,
}: {
  control: Control<CreateCvInput>;
}) {
  return (
    <Controller
      control={control}
      name="isOpeningBalance"
      render={({ field }) => (
        <Label className="flex items-start gap-2.5 rounded-lg border px-3 py-2.5 font-normal sm:col-span-full">
          <Checkbox
            checked={field.value ?? false}
            onCheckedChange={(checked) => field.onChange(checked === true)}
            className="mt-0.5"
          />
          <span className="grid gap-0.5">
            <span className="text-sm font-medium">CV de saldo inicial</span>
            <span className="text-xs text-muted-foreground">
              Para cargar horas vigentes antes de Kraken: solo líneas de horas
              de servicio, con costo y venta en 0. Al aprobarse abre las bolsas
              con su saldo.
            </span>
          </span>
        </Label>
      )}
    />
  );
}
