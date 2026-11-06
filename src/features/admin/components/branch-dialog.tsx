// src/features/admin/components/branch-dialog.tsx
// Alta o edición de una sucursal del cliente: nombre, dirección, municipio, teléfono y coordenadas opcionales
// (decisión 2026-11-06).
"use client";

import { LoaderCircle } from "lucide-react";
import { type ReactElement, useState } from "react";
import { CatalogCombobox } from "@/components/forms/catalog-combobox";
import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { upsertCustomerBranch } from "../actions/upsert-customer-branch";
import type { CustomerBranchView, CustomerFormOptions } from "../types";
import { LabeledInput } from "./labeled-input";
import { useAdminAction } from "./use-admin-action";

type Props = {
  customerId: string;
  branch?: CustomerBranchView;
  municipalities: CustomerFormOptions["municipalities"];
  trigger: ReactElement;
};

const TEXT_FIELDS = [
  ["name", "Nombre (Sucursal Santa Cruz, Planta Yacuiba…)"],
  ["address", "Dirección"],
  ["phone", "Teléfono"],
  ["latitude", "Latitud (opcional)"],
  ["longitude", "Longitud (opcional)"],
] as const;

export function BranchDialog({
  customerId,
  branch,
  municipalities,
  trigger,
}: Props) {
  const { isPending, error, run } = useAdminAction();
  const [open, setOpen] = useState(false);
  const [municipalityId, setMunicipalityId] = useState(
    branch?.municipalityId ?? null,
  );
  const [draft, setDraft] = useState({
    name: branch?.name ?? "",
    address: branch?.address ?? "",
    phone: branch?.phone ?? "",
    latitude: branch?.latitude ?? "",
    longitude: branch?.longitude ?? "",
  });

  async function save() {
    const ok = await run(() =>
      upsertCustomerBranch({
        id: branch?.id ?? null,
        customerId,
        municipalityId,
        ...draft,
      }),
    );
    if (ok) setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {branch ? `Editar ${branch.name}` : "Nueva sucursal"}
          </DialogTitle>
        </DialogHeader>
        <form
          id="branch-form"
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            save();
          }}
        >
          {TEXT_FIELDS.slice(0, 2).map(([key, label]) => (
            <LabeledInput
              key={key}
              label={label}
              value={draft[key]}
              onChange={(value) => setDraft({ ...draft, [key]: value })}
              className="sm:col-span-2"
            />
          ))}
          <FormField label="Municipio" htmlFor="branch-municipality">
            <CatalogCombobox
              id="branch-municipality"
              options={municipalities}
              value={municipalityId}
              onChange={setMunicipalityId}
              placeholder="Santa Cruz de la Sierra, Yacuiba…"
            />
          </FormField>
          {TEXT_FIELDS.slice(2).map(([key, label]) => (
            <LabeledInput
              key={key}
              label={label}
              value={draft[key]}
              onChange={(value) => setDraft({ ...draft, [key]: value })}
            />
          ))}
        </form>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button type="submit" form="branch-form" disabled={isPending}>
            {isPending && (
              <LoaderCircle className="animate-spin" aria-hidden="true" />
            )}
            {branch ? "Guardar cambios" : "Agregar sucursal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
