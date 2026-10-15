// src/features/admin/components/customer-form.tsx
// Ficha de un cliente (razón social, NIT, contacto general y ubicación): alta o edición.
"use client";

import { LoaderCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { upsertCustomer } from "../actions/upsert-customer";
import type { CustomerDetail } from "../types";
import { LabeledInput } from "./labeled-input";
import { useAdminAction } from "./use-admin-action";

type Draft = Record<
  "name" | "taxId" | "email" | "phone" | "address" | "city" | "country",
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
  { key: "city", label: "Ciudad" },
  { key: "country", label: "País" },
];

export function CustomerForm({ customer }: { customer?: CustomerDetail }) {
  const { isPending, error, run } = useAdminAction();
  const [saved, setSaved] = useState(false);
  const [draft, setDraft] = useState<Draft>({
    name: customer?.name ?? "",
    taxId: customer?.taxId ?? "",
    email: customer?.email ?? "",
    phone: customer?.phone ?? "",
    address: customer?.address ?? "",
    city: customer?.city ?? "",
    country: customer?.country ?? "Bolivia",
  });

  async function save() {
    setSaved(false);
    const input = { id: customer?.id ?? null, ...draft };
    if (!customer)
      return run(
        () => upsertCustomer(input),
        (data) => `/admin/clientes/${data.id}`,
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
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <Button type="submit" disabled={isPending}>
          {isPending && (
            <LoaderCircle className="animate-spin" aria-hidden="true" />
          )}
          {customer ? "Guardar cambios" : "Crear cliente"}
        </Button>
        {saved && !error && (
          <output className="block text-sm text-muted-foreground">
            Guardado. Un CV en borrador toma estos datos al guardar su cabecera;
            los enviados o aprobados conservan su copia.
          </output>
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
    </form>
  );
}
