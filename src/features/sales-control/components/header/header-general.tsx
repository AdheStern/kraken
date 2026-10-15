// src/features/sales-control/components/header/header-general.tsx
// Secciones Identificación, Personas y Clasificación de la cabecera del CV.
"use client";

import { Controller, type UseFormReturn } from "react-hook-form";
import { CatalogCombobox } from "@/components/forms/catalog-combobox";
import { CatalogMultiCombobox } from "@/components/forms/catalog-multi-combobox";
import { FormField } from "@/components/forms/form-field";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CvHeaderInput } from "../../schemas/cv-header-schema";
import type { CvFormOptions } from "../../types";
import { HeaderSection } from "./header-section";

type Props = {
  form: UseFormReturn<CvHeaderInput>;
  options: CvFormOptions;
  disabled: boolean;
};

export function HeaderGeneral({ form, options, disabled }: Props) {
  const { errors } = form.formState;
  const { control, register } = form;

  return (
    <>
      <HeaderSection title="Identificación">
        <FormField
          label="Título"
          htmlFor="cv-title"
          error={errors.title?.message}
          className="sm:col-span-2 lg:col-span-3"
        >
          <Input id="cv-title" disabled={disabled} {...register("title")} />
        </FormField>
        <FormField
          label="Fecha"
          htmlFor="cv-issued-on"
          error={errors.issuedOn?.message}
        >
          <Controller
            control={control}
            name="issuedOn"
            render={({ field }) => (
              <DatePicker
                id="cv-issued-on"
                value={field.value ?? ""}
                onChange={field.onChange}
                disabled={disabled}
              />
            )}
          />
        </FormField>
      </HeaderSection>

      <HeaderSection title="Personas">
        <FormField
          label="Vendedores"
          htmlFor="cv-sellers"
          error={errors.sellerIds?.message}
          className="sm:col-span-2"
        >
          <Controller
            control={control}
            name="sellerIds"
            render={({ field }) => (
              <CatalogMultiCombobox
                id="cv-sellers"
                options={options.people}
                value={field.value}
                onChange={field.onChange}
                disabled={disabled}
                invalid={!!errors.sellerIds}
              />
            )}
          />
        </FormField>
        <FormField label="Preventa" htmlFor="cv-presales">
          <Controller
            control={control}
            name="presalesId"
            render={({ field }) => (
              <CatalogCombobox
                id="cv-presales"
                options={options.people}
                value={field.value}
                onChange={field.onChange}
                disabled={disabled}
                placeholder="Sin preventa"
              />
            )}
          />
        </FormField>
        <FormField label="Postventa" htmlFor="cv-postsales">
          <Controller
            control={control}
            name="postsalesId"
            render={({ field }) => (
              <CatalogCombobox
                id="cv-postsales"
                options={options.people}
                value={field.value}
                onChange={field.onChange}
                disabled={disabled}
                placeholder="Sin postventa"
              />
            )}
          />
        </FormField>
      </HeaderSection>

      <HeaderSection title="Clasificación">
        <FormField label="Línea principal" htmlFor="cv-main-technology">
          <Controller
            control={control}
            name="mainTechnologyId"
            render={({ field }) => (
              <CatalogCombobox
                id="cv-main-technology"
                options={options.technologies}
                value={field.value}
                onChange={field.onChange}
                disabled={disabled}
                placeholder="Tecnología"
              />
            )}
          />
        </FormField>
        <FormField label="Tipo de servicio" htmlFor="cv-service-type">
          <Controller
            control={control}
            name="serviceTypeId"
            render={({ field }) => (
              <CatalogCombobox
                id="cv-service-type"
                options={options.serviceTypes}
                value={field.value}
                onChange={field.onChange}
                disabled={disabled}
              />
            )}
          />
        </FormField>
        <Controller
          control={control}
          name="isNewTechnology"
          render={({ field }) => (
            <Label className="flex items-center gap-2 self-end pb-2 text-sm font-normal">
              <Checkbox
                checked={field.value}
                onCheckedChange={(checked) => field.onChange(checked === true)}
                disabled={disabled}
              />
              Nueva tecnología
            </Label>
          )}
        />
      </HeaderSection>
    </>
  );
}
