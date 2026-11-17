// src/features/admin/components/customer-classification-fields.tsx
// Rubro, tipo de empresa, municipio y grupo empresarial de la ficha del cliente (decisiones 2026-11-06 y
// 2026-11-16); el municipio se busca por nombre o departamento entre los 340 de Bolivia.
"use client";

import { CatalogCombobox } from "@/components/forms/catalog-combobox";
import { FormField } from "@/components/forms/form-field";
import { OptionSelect } from "@/components/ui/option-select";
import type { CompanyType } from "@/generated/prisma/enums";
import { COMPANY_TYPE_LABELS, COMPANY_TYPES } from "../company-types";
import type { CustomerFormOptions } from "../types";
import { CustomerGroupField } from "./customer-group-field";

export type Classification = {
  industryId: string | null;
  companyType: CompanyType | null;
  municipalityId: string | null;
  groupId: string | null;
};

type Props = {
  value: Classification;
  onChange: (patch: Partial<Classification>) => void;
  options: CustomerFormOptions;
  // Ciudad escrita a mano antes del catálogo; se muestra mientras no se elija un municipio.
  legacyCity: string | null;
  readOnly?: boolean;
};

export function CustomerClassificationFields({
  value,
  onChange,
  options,
  legacyCity,
  readOnly,
}: Props) {
  return (
    <>
      <FormField label="Rubro" htmlFor="customer-industry">
        <CatalogCombobox
          id="customer-industry"
          options={options.industries}
          value={value.industryId}
          onChange={(industryId) => onChange({ industryId })}
          placeholder="Banca, minería, gobierno…"
        />
      </FormField>
      <FormField label="Tipo de empresa" htmlFor="customer-type">
        <OptionSelect
          id="customer-type"
          value={value.companyType}
          options={COMPANY_TYPES.map((id) => ({
            id,
            label: COMPANY_TYPE_LABELS[id],
          }))}
          emptyLabel="Sin definir"
          onValueChange={(v) =>
            onChange({ companyType: (v as CompanyType | null) ?? null })
          }
          className="h-9 w-full"
        />
      </FormField>
      <FormField
        label="Municipio"
        htmlFor="customer-municipality"
        hint={
          !value.municipalityId && legacyCity
            ? `Antes figuraba «${legacyCity}». Elige su municipio.`
            : "Cualquier municipio de Bolivia; busca por nombre o departamento."
        }
        className="sm:col-span-2"
      >
        <CatalogCombobox
          id="customer-municipality"
          options={options.municipalities}
          value={value.municipalityId}
          onChange={(municipalityId) => onChange({ municipalityId })}
          placeholder="La Paz, Yacuiba, Montero…"
        />
      </FormField>
      <CustomerGroupField
        value={value.groupId}
        onChange={(groupId) => onChange({ groupId })}
        groups={options.groups}
        disabled={readOnly}
      />
    </>
  );
}
