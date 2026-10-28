// src/features/tickets/components/new-ticket-bag-fields.tsx
// Bolsa inicial (opcional) y modalidad del SLA del alta de ticket: con bolsa, el SLA toma su modalidad
// (AGENTS.md §2.6, §2.7).
"use client";

import { Controller, type UseFormReturn, useWatch } from "react-hook-form";
import { CatalogCombobox } from "@/components/forms/catalog-combobox";
import { FormField } from "@/components/forms/form-field";
import { OptionSelect } from "@/components/ui/option-select";
import type { TicketFormOptions } from "../queries/get-ticket-form-options";
import type { CreateTicketInput } from "../schemas/ticket-schemas";
import { MODALITY_LABELS } from "../ticket-labels";

const MODALITIES = Object.entries(MODALITY_LABELS).map(([id, label]) => ({
  id,
  label,
}));

type Props = {
  form: UseFormReturn<CreateTicketInput>;
  bags: TicketFormOptions["bags"];
};

export function NewTicketBagFields({ form, bags }: Props) {
  const { errors } = form.formState;
  const [customerId, bagId] = useWatch({
    control: form.control,
    name: ["customerId", "bagId"],
  });
  const placeholder = !customerId
    ? "Elige primero el cliente"
    : bags.length === 0
      ? "El cliente no tiene bolsas activas para estas áreas"
      : "Sin bolsa por ahora";
  return (
    <>
      <FormField
        label="Bolsa de horas (opcional)"
        htmlFor="new-ticket-bagId"
        error={errors.bagId?.message}
        hint="Es la prioridad 1 del ticket; las demás se suman en el detalle."
        className="sm:col-span-2"
      >
        <Controller
          control={form.control}
          name="bagId"
          render={({ field }) => (
            <CatalogCombobox
              id="new-ticket-bagId"
              options={bags}
              value={field.value}
              onChange={(id) => {
                field.onChange(id);
                const bag = bags.find((b) => b.id === id);
                if (bag) form.setValue("slaModality", bag.modality);
              }}
              disabled={bags.length === 0}
              placeholder={placeholder}
            />
          )}
        />
      </FormField>
      <FormField
        label="Modalidad del SLA"
        htmlFor="new-ticket-sla"
        hint={bagId ? "Viene de la bolsa elegida." : undefined}
      >
        <Controller
          control={form.control}
          name="slaModality"
          render={({ field }) => (
            <OptionSelect
              id="new-ticket-sla"
              value={field.value}
              options={MODALITIES}
              onValueChange={(v) => v && field.onChange(v)}
              disabled={bagId !== null}
            />
          )}
        />
      </FormField>
    </>
  );
}
