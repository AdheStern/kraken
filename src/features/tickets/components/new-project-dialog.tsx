// src/features/tickets/components/new-project-dialog.tsx
// Diálogo para crear un proyecto: nombre, cliente, áreas y fechas opcionales (AGENTS.md §2.6).
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { CatalogCombobox } from "@/components/forms/catalog-combobox";
import { CatalogMultiCombobox } from "@/components/forms/catalog-multi-combobox";
import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { createProject } from "../actions/create-project";
import type { TicketFormOptions } from "../queries/get-ticket-form-options";
import {
  type CreateProjectInput,
  createProjectSchema,
} from "../schemas/ticket-work-schemas";

type Props = { options: Pick<TicketFormOptions, "customers" | "areas"> };
const DEFAULTS: CreateProjectInput = {
  name: "",
  customerId: "",
  areaIds: [],
  startsOn: null,
  endsOn: null,
};

export function NewProjectDialog({ options }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useForm<CreateProjectInput>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: DEFAULTS,
  });
  const { errors, isSubmitting } = form.formState;

  async function onSubmit(values: CreateProjectInput) {
    setServerError(null);
    const result = await createProject(values);
    if (!result.ok) return setServerError(result.error.message);
    setOpen(false);
    form.reset(DEFAULTS);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus aria-hidden="true" />
        Nuevo proyecto
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nuevo proyecto</DialogTitle>
          <DialogDescription>
            Agrupa los tickets de una implementación. Un CV puede venderle horas
            con alcance «proyecto».
          </DialogDescription>
        </DialogHeader>
        <form
          id="new-project"
          onSubmit={form.handleSubmit(onSubmit)}
          className="grid gap-4 sm:grid-cols-2"
        >
          <FormField
            label="Nombre"
            htmlFor="new-project-name"
            error={errors.name?.message}
            className="sm:col-span-2"
          >
            <Input
              id="new-project-name"
              placeholder="Migración del data center"
              {...form.register("name")}
            />
          </FormField>
          <FormField
            label="Cliente"
            htmlFor="new-project-customer"
            error={errors.customerId?.message}
          >
            <Controller
              control={form.control}
              name="customerId"
              render={({ field }) => (
                <CatalogCombobox
                  id="new-project-customer"
                  options={options.customers}
                  value={field.value || null}
                  onChange={(id) => field.onChange(id ?? "")}
                  invalid={!!errors.customerId}
                  placeholder="Nombre o NIT"
                />
              )}
            />
          </FormField>
          <FormField
            label="Áreas"
            htmlFor="new-project-areas"
            error={errors.areaIds?.message}
            className="sm:col-span-2"
          >
            <Controller
              control={form.control}
              name="areaIds"
              render={({ field }) => (
                <CatalogMultiCombobox
                  id="new-project-areas"
                  options={options.areas}
                  value={field.value}
                  onChange={field.onChange}
                  invalid={!!errors.areaIds}
                  placeholder="DIMANET…"
                />
              )}
            />
          </FormField>
          {(["startsOn", "endsOn"] as const).map((name) => (
            <FormField
              key={name}
              label={
                name === "startsOn" ? "Inicio (opcional)" : "Fin (opcional)"
              }
              htmlFor={`new-project-${name}`}
              error={errors[name]?.message}
            >
              <Controller
                control={form.control}
                name={name}
                render={({ field }) => (
                  <DatePicker
                    value={field.value ?? ""}
                    clearable
                    placeholder="Sin fecha"
                    aria-label={name === "startsOn" ? "Inicio" : "Fin"}
                    onChange={(v) => field.onChange(v || null)}
                  />
                )}
              />
            </FormField>
          ))}
        </form>
        {serverError && (
          <p
            role="alert"
            className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {serverError}
          </p>
        )}
        <DialogFooter>
          <Button type="submit" form="new-project" disabled={isSubmitting}>
            {isSubmitting && (
              <LoaderCircle className="animate-spin" aria-hidden="true" />
            )}
            {isSubmitting ? "Creando…" : "Crear proyecto"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
