// src/features/tickets/components/new-ticket-fields.tsx
// Campos del alta de ticket: cliente, ciudad, áreas, proyecto, prioridad, modalidad del SLA, título,
// descripción y encargado. Los proyectos se filtran por cliente y los ingenieros por área.
"use client";

import { Controller, type UseFormReturn } from "react-hook-form";
import { CatalogCombobox } from "@/components/forms/catalog-combobox";
import { CatalogMultiCombobox } from "@/components/forms/catalog-multi-combobox";
import { FormField } from "@/components/forms/form-field";
import { Input } from "@/components/ui/input";
import { OptionSelect } from "@/components/ui/option-select";
import { Textarea } from "@/components/ui/textarea";
import type {
  TicketFormOptions,
  TicketOption,
} from "../queries/get-ticket-form-options";
import type { CreateTicketInput } from "../schemas/ticket-schemas";
import { MODALITY_LABELS, PRIORITY_LABELS } from "../ticket-labels";

// POR QUÉ: cliente y ciudad vacíos son "" para que zod muestre su mensaje; proyecto y encargado son opcionales.
const REQUIRED = new Set(["customerId", "cityId"]);

const toOptions = (labels: Record<string, string>) =>
  Object.entries(labels).map(([id, label]) => ({ id, label }));

type Props = {
  form: UseFormReturn<CreateTicketInput>;
  options: TicketFormOptions;
};

export function NewTicketFields({ form, options }: Props) {
  const { errors } = form.formState;
  const [customerId, areaIds] = form.watch(["customerId", "areaIds"]);
  const projects = options.projects.filter((p) => p.customerId === customerId);
  const engineers = options.engineers.filter(
    (e) => e.areaIds === null || e.areaIds.some((a) => areaIds.includes(a)),
  );
  const combo = (
    name: "customerId" | "cityId" | "projectId" | "ownerId",
    list: TicketOption[],
    placeholder: string,
  ) => (
    <Controller
      control={form.control}
      name={name}
      render={({ field }) => (
        <CatalogCombobox
          id={`new-ticket-${name}`}
          options={list}
          value={field.value || null}
          onChange={(id) =>
            field.onChange(id ?? (REQUIRED.has(name) ? "" : null))
          }
          invalid={!!errors[name]}
          placeholder={placeholder}
        />
      )}
    />
  );
  return (
    <>
      <FormField
        label="Cliente"
        htmlFor="new-ticket-customerId"
        error={errors.customerId?.message}
      >
        {combo("customerId", options.customers, "Nombre o NIT")}
      </FormField>
      <FormField
        label="Ciudad"
        htmlFor="new-ticket-cityId"
        error={errors.cityId?.message}
        hint="Define el horario y los feriados del ticket."
      >
        {combo("cityId", options.cities, "LP, SC o CB")}
      </FormField>
      <FormField
        label="Áreas"
        htmlFor="new-ticket-areas"
        error={errors.areaIds?.message}
      >
        <Controller
          control={form.control}
          name="areaIds"
          render={({ field }) => (
            <CatalogMultiCombobox
              id="new-ticket-areas"
              options={options.areas}
              value={field.value}
              onChange={field.onChange}
              invalid={!!errors.areaIds}
              placeholder="DIMANET, DIMAHELP…"
            />
          )}
        />
      </FormField>
      <FormField
        label="Proyecto (opcional)"
        htmlFor="new-ticket-projectId"
        error={errors.projectId?.message}
      >
        {combo(
          "projectId",
          projects,
          customerId ? "Sin proyecto" : "Elige primero el cliente",
        )}
      </FormField>
      <FormField label="Prioridad" htmlFor="new-ticket-priority">
        <Controller
          control={form.control}
          name="priority"
          render={({ field }) => (
            <OptionSelect
              id="new-ticket-priority"
              value={field.value}
              options={toOptions(PRIORITY_LABELS)}
              onValueChange={(v) => v && field.onChange(v)}
            />
          )}
        />
      </FormField>
      <FormField label="Modalidad del SLA" htmlFor="new-ticket-sla">
        <Controller
          control={form.control}
          name="slaModality"
          render={({ field }) => (
            <OptionSelect
              id="new-ticket-sla"
              value={field.value}
              options={toOptions(MODALITY_LABELS)}
              onValueChange={(v) => v && field.onChange(v)}
            />
          )}
        />
      </FormField>
      <FormField
        label="Título"
        htmlFor="new-ticket-title"
        error={errors.title?.message}
        className="sm:col-span-2"
      >
        <Input
          id="new-ticket-title"
          placeholder="Switch core sin respuesta en el piso 3"
          {...form.register("title")}
        />
      </FormField>
      <FormField
        label="Descripción"
        htmlFor="new-ticket-description"
        error={errors.description?.message}
        className="sm:col-span-2"
      >
        <Textarea
          id="new-ticket-description"
          rows={3}
          placeholder="Qué pidió el cliente y cómo contactarlo."
          {...form.register("description")}
        />
      </FormField>
      <FormField
        label="Encargado (opcional)"
        htmlFor="new-ticket-ownerId"
        error={errors.ownerId?.message}
        className="sm:col-span-2"
      >
        {combo(
          "ownerId",
          engineers,
          areaIds.length ? "Asignar después" : "Elige primero las áreas",
        )}
      </FormField>
    </>
  );
}
