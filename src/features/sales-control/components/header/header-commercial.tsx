// src/features/sales-control/components/header/header-commercial.tsx
// Secciones Cliente, Orden del cliente, Cambio y Notas de la cabecera del CV.
"use client";

import Decimal from "decimal.js";
import { TriangleAlert } from "lucide-react";
import { Controller, type UseFormReturn } from "react-hook-form";
import { CatalogCombobox } from "@/components/forms/catalog-combobox";
import { FormField } from "@/components/forms/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { isFxRateDeviating } from "@/domain/pricing/fx-deviation";
import type { CvHeaderInput } from "../../schemas/cv-header-schema";
import type { CvFormOptions } from "../../types";
import { HeaderSection } from "./header-section";

type Props = {
  form: UseFormReturn<CvHeaderInput>;
  options: CvFormOptions;
  disabled: boolean;
  customerName: string;
  officialFxRate: string | null;
  maxFxDeviationPct: string;
};

export function HeaderCommercial({
  form,
  options,
  disabled,
  customerName,
  officialFxRate,
  maxFxDeviationPct,
}: Props) {
  const { errors } = form.formState;
  const { control, register, watch } = form;
  const deviates = (rate: string) =>
    officialFxRate !== null &&
    /^\d+(\.\d+)?$/.test(rate) &&
    isFxRateDeviating(
      new Decimal(rate),
      new Decimal(officialFxRate),
      new Decimal(maxFxDeviationPct),
    );
  const isDeviating =
    deviates(watch("costFxRate")) || deviates(watch("saleFxRate"));

  return (
    <>
      <HeaderSection title="Cliente">
        <FormField
          label="Cliente"
          htmlFor="cv-customer"
          hint="Se fija al crear el CV."
        >
          <Input id="cv-customer" value={customerName} readOnly disabled />
        </FormField>
        <FormField
          label="Contacto"
          htmlFor="cv-contact-name"
          error={errors.contactName?.message}
        >
          <Input
            id="cv-contact-name"
            disabled={disabled}
            {...register("contactName")}
          />
        </FormField>
        <FormField
          label="Correo del contacto"
          htmlFor="cv-contact-email"
          error={errors.contactEmail?.message}
        >
          <Input
            id="cv-contact-email"
            type="email"
            disabled={disabled}
            {...register("contactEmail")}
          />
        </FormField>
        <FormField
          label="Teléfono del contacto"
          htmlFor="cv-contact-phone"
          error={errors.contactPhone?.message}
        >
          <Input
            id="cv-contact-phone"
            type="tel"
            disabled={disabled}
            {...register("contactPhone")}
          />
        </FormField>
        <FormField
          label="Cliente final"
          htmlFor="cv-end-customer"
          hint="Solo si DIMA vende a través de un tercero."
          className="sm:col-span-2"
        >
          <Controller
            control={control}
            name="endCustomerId"
            render={({ field }) => (
              <CatalogCombobox
                id="cv-end-customer"
                options={options.customers}
                value={field.value}
                onChange={field.onChange}
                disabled={disabled}
                placeholder="Igual al cliente"
              />
            )}
          />
        </FormField>
      </HeaderSection>

      <HeaderSection title="Orden del cliente">
        <FormField
          label="N° de OC"
          htmlFor="cv-po-number"
          error={errors.customerPoNumber?.message}
        >
          <Input
            id="cv-po-number"
            disabled={disabled}
            {...register("customerPoNumber")}
          />
        </FormField>
        <FormField
          label="Fecha de OC"
          htmlFor="cv-po-date"
          error={errors.customerPoDate?.message}
        >
          <Input
            id="cv-po-date"
            type="date"
            disabled={disabled}
            {...register("customerPoDate")}
          />
        </FormField>
        <FormField
          label="Términos de pago"
          htmlFor="cv-payment-terms"
          error={errors.paymentTerms?.message}
        >
          <Input
            id="cv-payment-terms"
            placeholder="30 días"
            disabled={disabled}
            {...register("paymentTerms")}
          />
        </FormField>
        <FormField
          label="Fecha de entrega"
          htmlFor="cv-delivery-on"
          error={errors.deliveryOn?.message}
        >
          <Input
            id="cv-delivery-on"
            type="date"
            disabled={disabled}
            {...register("deliveryOn")}
          />
        </FormField>
      </HeaderSection>

      <HeaderSection title="Cambio">
        <FormField
          label="TC de costo"
          htmlFor="cv-cost-fx"
          error={errors.costFxRate?.message}
        >
          <Input
            id="cv-cost-fx"
            inputMode="decimal"
            className="tabular-nums"
            disabled={disabled}
            {...register("costFxRate")}
          />
        </FormField>
        <FormField
          label="TC de venta"
          htmlFor="cv-sale-fx"
          error={errors.saleFxRate?.message}
        >
          <Input
            id="cv-sale-fx"
            inputMode="decimal"
            className="tabular-nums"
            disabled={disabled}
            {...register("saleFxRate")}
          />
        </FormField>
        <FormField
          label="TC oficial BCB"
          htmlFor="cv-official-fx"
          hint="Referencia guardada al crear el CV."
        >
          <Input
            id="cv-official-fx"
            value={officialFxRate ?? "Sin dato"}
            readOnly
            disabled
            className="tabular-nums"
          />
        </FormField>
        {isDeviating && (
          <p className="flex items-start gap-2 self-end rounded-lg bg-warning/12 px-3 py-2 text-xs text-warning">
            <TriangleAlert
              className="mt-px size-3.5 shrink-0"
              aria-hidden="true"
            />
            El TC ingresado se aleja más de {maxFxDeviationPct}% del oficial.
            Revísalo antes de enviar.
          </p>
        )}
      </HeaderSection>

      <HeaderSection title="Notas">
        <FormField
          label="Notas aclaratorias"
          htmlFor="cv-notes"
          error={errors.notes?.message}
          className="sm:col-span-2 lg:col-span-4"
        >
          <Textarea
            id="cv-notes"
            rows={3}
            disabled={disabled}
            {...register("notes")}
          />
        </FormField>
      </HeaderSection>
    </>
  );
}
