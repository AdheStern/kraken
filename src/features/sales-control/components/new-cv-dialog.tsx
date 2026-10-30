// src/features/sales-control/components/new-cv-dialog.tsx
// Diálogo para crear un CV: ciudad, cliente, título y tipos de cambio; al crear abre el editor y el siguiente alta
// empieza en blanco.
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLayoutEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { CatalogCombobox } from "@/components/forms/catalog-combobox";
import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
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
import { createCv } from "../actions/create-cv";
import {
  type CreateCvInput,
  createCvSchema,
} from "../schemas/create-cv-schema";
import type { CvFormOptions } from "../types";
import { OpeningBalanceField } from "./opening-balance-field";

// POR QUÉ: valores de las plantillas actuales (AGENTS.md §2.2); el comercial los ajusta a la coyuntura.
const DEFAULT_FX = { costFxRate: "6.97", saleFxRate: "6.96" };
const DEFAULTS: CreateCvInput = {
  cityId: "",
  customerId: "",
  title: "",
  ...DEFAULT_FX,
  isOpeningBalance: false,
};

export function NewCvDialog({
  options,
}: {
  options: Pick<CvFormOptions, "cities" | "customers">;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useForm<CreateCvInput>({
    resolver: zodResolver(createCvSchema),
    defaultValues: DEFAULTS,
  });
  const { errors, isSubmitting } = form.formState;
  // TRAMPA: con Cache Components la página no se desmonta al navegar (<Activity>); sin esto, al volver el
  // diálogo sigue abierto. El borrador se conserva hasta que se crea el CV.
  useLayoutEffect(() => () => setOpen(false), []);

  async function onSubmit(values: CreateCvInput) {
    setServerError(null);
    const result = await createCv(values);
    if (!result.ok) return setServerError(result.error.message);
    form.reset(DEFAULTS);
    setOpen(false);
    router.push(`/cv/${result.data.cvId}`);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus aria-hidden="true" />
        Nuevo CV
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nuevo Control de Venta</DialogTitle>
          <DialogDescription>
            El número se asigna al crear, según la ciudad y el año. Después
            completas la cabecera y las líneas.
          </DialogDescription>
        </DialogHeader>
        <form
          id="new-cv"
          onSubmit={form.handleSubmit(onSubmit)}
          className="grid gap-4 sm:grid-cols-2"
        >
          <FormField
            label="Ciudad"
            htmlFor="new-cv-city"
            error={errors.cityId?.message}
          >
            <Controller
              control={form.control}
              name="cityId"
              render={({ field }) => (
                <CatalogCombobox
                  id="new-cv-city"
                  options={options.cities}
                  value={field.value || null}
                  onChange={(id) => field.onChange(id ?? "")}
                  invalid={!!errors.cityId}
                  placeholder="LP, SC o CB"
                />
              )}
            />
          </FormField>
          <FormField
            label="Cliente"
            htmlFor="new-cv-customer"
            error={errors.customerId?.message}
          >
            <Controller
              control={form.control}
              name="customerId"
              render={({ field }) => (
                <CatalogCombobox
                  id="new-cv-customer"
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
            label="Título"
            htmlFor="new-cv-title"
            error={errors.title?.message}
            className="sm:col-span-2"
          >
            <Input
              id="new-cv-title"
              placeholder="Renovación de licencias Microsoft 365"
              {...form.register("title")}
            />
          </FormField>
          <FormField
            label="TC de costo"
            htmlFor="new-cv-cost-fx"
            error={errors.costFxRate?.message}
          >
            <Input
              id="new-cv-cost-fx"
              inputMode="decimal"
              className="tabular-nums"
              {...form.register("costFxRate")}
            />
          </FormField>
          <FormField
            label="TC de venta"
            htmlFor="new-cv-sale-fx"
            error={errors.saleFxRate?.message}
          >
            <Input
              id="new-cv-sale-fx"
              inputMode="decimal"
              className="tabular-nums"
              {...form.register("saleFxRate")}
            />
          </FormField>
          <OpeningBalanceField control={form.control} />
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
          <Button type="submit" form="new-cv" disabled={isSubmitting}>
            {isSubmitting && (
              <LoaderCircle className="animate-spin" aria-hidden="true" />
            )}
            {isSubmitting ? "Creando…" : "Crear CV"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
