// src/features/sales-control/components/header/payment-origin-field.tsx
// Interruptor de la cabecera del CV entre pago local y pago en el exterior; solo informa (decisión 2026-11-19).
"use client";

import { type Control, Controller } from "react-hook-form";
import { FormField } from "@/components/forms/form-field";
import { Switch } from "@/components/ui/switch";
import type { CvHeaderInput } from "../../schemas/cv-header-schema";

type Props = { control: Control<CvHeaderInput>; disabled: boolean };

export function PaymentOriginField({ control, disabled }: Props) {
  return (
    <FormField label="Pago del cliente" htmlFor="cv-foreign-payment">
      <Controller
        control={control}
        name="isForeignPayment"
        render={({ field }) => (
          <div className="flex h-9 items-center gap-2.5 text-sm">
            <span className={tone(!field.value)}>Local</span>
            <Switch
              id="cv-foreign-payment"
              aria-label="Pago en el exterior"
              checked={field.value}
              onCheckedChange={(checked) => field.onChange(checked)}
              disabled={disabled}
            />
            <span className={tone(field.value)}>En el exterior</span>
          </div>
        )}
      />
    </FormField>
  );
}

function tone(isActive: boolean) {
  return isActive ? "font-medium text-foreground" : "text-muted-foreground";
}
