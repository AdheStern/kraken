// src/features/admin/components/customer-form.tsx
// Ficha de un cliente (razón social, NIT, rubro, tipo, contacto general, municipio, tenant y notas): alta o edición; de solo
// lectura para quien no gestiona clientes (decisión 2026-11-06).
"use client";

import { LoaderCircle } from "lucide-react";
import { useId, useState } from "react";
import { useMarkCreated } from "@/components/forms/fresh-after-create";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { upsertCustomer } from "../actions/upsert-customer";
import type { CustomerDetail, CustomerFormOptions } from "../types";
import {
  type Classification,
  CustomerClassificationFields,
} from "./customer-classification-fields";
import { LabeledInput } from "./labeled-input";
import { useAdminAction } from "./use-admin-action";

type Draft = Record<
  "name" | "taxId" | "email" | "phone" | "address" | "country" | "tenant",
  string
>;

const FIELDS: {
  key: keyof Draft;
  label: string;
  wide?: boolean;
  type?: string;
}[] = [
  { key: "name", label: "Razón social", wide: true },
  { key: "taxId", label: "NIT" },
  { key: "email", label: "Correo", type: "email" },
  { key: "phone", label: "Teléfono" },
  { key: "address", label: "Dirección" },
  { key: "country", label: "País" },
  { key: "tenant", label: "Tenant" },
];

export function CustomerForm({
  customer,
  options,
  readOnly = false,
}: {
  customer?: CustomerDetail;
  options: CustomerFormOptions;
  readOnly?: boolean;
}) {
  const { isPending, error, run } = useAdminAction();
  const markCreated = useMarkCreated();
  const [saved, setSaved] = useState(false);
  const notesId = useId();
  const [notes, setNotes] = useState(customer?.notes ?? "");
  const [draft, setDraft] = useState<Draft>({
    name: customer?.name ?? "",
    taxId: customer?.taxId ?? "",
    email: customer?.email ?? "",
    phone: customer?.phone ?? "",
    address: customer?.address ?? "",
    country: customer?.country ?? "Bolivia",
    tenant: customer?.tenant ?? "",
  });
  const [classification, setClassification] = useState<Classification>({
    industryId: customer?.industryId ?? null,
    companyType: customer?.companyType ?? null,
    municipalityId: customer?.municipalityId ?? null,
    groupId: customer?.groupId ?? null,
  });

  async function save() {
    setSaved(false);
    const input = {
      id: customer?.id ?? null,
      ...draft,
      notes,
      ...classification,
    };
    if (!customer)
      return run(
        () => upsertCustomer(input),
        (data) => {
          markCreated();
          return `/clientes/${data.id}`;
        },
      );
    setSaved(await run(() => upsertCustomer(input)));
  }

  return (
    <form
      className="kr-surface grid gap-4 rounded-xl p-5 sm:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
    >
      <fieldset disabled={readOnly} className="contents">
        {FIELDS.map((f) => (
          <LabeledInput
            key={f.key}
            label={f.label}
            type={f.type}
            value={draft[f.key]}
            onChange={(value) => setDraft({ ...draft, [f.key]: value })}
            className={f.wide ? "sm:col-span-2" : undefined}
          />
        ))}
        <CustomerClassificationFields
          value={classification}
          onChange={(patch) =>
            setClassification({ ...classification, ...patch })
          }
          options={options}
          legacyCity={customer?.city ?? null}
          readOnly={readOnly}
        />
        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor={notesId}>Notas</Label>
          <Textarea
            id={notesId}
            value={notes}
            maxLength={4000}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </fieldset>
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
          <Button type="submit" disabled={isPending}>
            {isPending && (
              <LoaderCircle className="animate-spin" aria-hidden="true" />
            )}
            {customer ? "Guardar cambios" : "Crear cliente"}
          </Button>
          {saved && !error && (
            <output className="block text-sm text-muted-foreground">
              Guardado. Un CV en borrador toma estos datos al guardar su
              cabecera; los enviados o aprobados conservan su copia.
            </output>
          )}
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </div>
      )}
    </form>
  );
}
