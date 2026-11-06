// src/features/admin/components/contact-dialog.tsx
// Alta o edición del puesto de un contacto: nombre, cargo, correo, teléfono, municipio, sucursal, áreas de DIMA
// con las que trata y quiénes de DIMA lo atienden (decisión 2026-11-06).
"use client";

import { LoaderCircle } from "lucide-react";
import { type ReactElement, useState } from "react";
import { CatalogCombobox } from "@/components/forms/catalog-combobox";
import { CatalogMultiCombobox } from "@/components/forms/catalog-multi-combobox";
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
import type { ContactFormOptions, CustomerContactView } from "../types";
import { DuplicateMatches } from "./duplicate-matches";
import { LabeledInput } from "./labeled-input";
import { useContactSave } from "./use-contact-save";

type Props = {
  customerId: string;
  contact?: CustomerContactView;
  options: ContactFormOptions;
  trigger: ReactElement;
};

const TEXT = [
  ["name", "Nombre"],
  ["position", "Cargo"],
  ["email", "Correo"],
  ["phone", "Teléfono"],
] as const;

export function ContactDialog({
  customerId,
  contact,
  options,
  trigger,
}: Props) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState({
    name: contact?.name ?? "",
    position: contact?.position ?? "",
    email: contact?.email ?? "",
    phone: contact?.phone ?? "",
  });
  const [links, setLinks] = useState({
    municipalityId: contact?.municipalityId ?? null,
    branchId: contact?.branchId ?? null,
    areaIds: contact?.areaIds ?? [],
    userIds: contact?.userIds ?? [],
  });

  const { isPending, error, matches, save, pickMatch, createAnyway } =
    useContactSave({
      customerId,
      contactId: contact?.id ?? null,
      onDone: () => setOpen(false),
    });
  const form = { ...text, ...links };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {contact ? `Editar ${contact.name}` : "Nuevo contacto"}
          </DialogTitle>
        </DialogHeader>
        <form
          id="contact-form"
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            save(form);
          }}
        >
          {TEXT.map(([key, label]) => (
            <LabeledInput
              key={key}
              label={label}
              type={key === "email" ? "email" : undefined}
              value={text[key]}
              onChange={(value) => setText({ ...text, [key]: value })}
            />
          ))}
          <FormField label="Municipio" htmlFor="contact-municipality">
            <CatalogCombobox
              id="contact-municipality"
              options={options.municipalities}
              value={links.municipalityId}
              onChange={(municipalityId) =>
                setLinks({ ...links, municipalityId })
              }
              placeholder="Santa Cruz de la Sierra, Yacuiba…"
            />
          </FormField>
          <FormField label="Sucursal" htmlFor="contact-branch">
            <CatalogCombobox
              id="contact-branch"
              options={options.branches}
              value={links.branchId}
              onChange={(branchId) => setLinks({ ...links, branchId })}
              placeholder={
                options.branches.length ? "Oficina central" : "Sin sucursales"
              }
              disabled={options.branches.length === 0}
            />
          </FormField>
          <FormField
            label="Áreas de DIMA con las que trata"
            htmlFor="contact-areas"
            className="sm:col-span-2"
          >
            <CatalogMultiCombobox
              id="contact-areas"
              options={options.areas}
              value={links.areaIds}
              onChange={(areaIds) => setLinks({ ...links, areaIds })}
              placeholder="DIMASOFT, DIMANET…"
            />
          </FormField>
          <FormField
            label="Quiénes de DIMA lo atienden"
            htmlFor="contact-users"
            className="sm:col-span-2"
          >
            <CatalogMultiCombobox
              id="contact-users"
              options={options.users}
              value={links.userIds}
              onChange={(userIds) => setLinks({ ...links, userIds })}
              placeholder="Comercial, ingeniero…"
            />
          </FormField>
        </form>
        {matches && matches.length > 0 && (
          <DuplicateMatches
            customerId={customerId}
            matches={matches}
            isPending={isPending}
            onPick={(match) => pickMatch(match, form)}
            onCreateAnyway={() => createAnyway(form)}
          />
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button
            type="submit"
            form="contact-form"
            disabled={isPending || (matches?.length ?? 0) > 0}
          >
            {isPending && (
              <LoaderCircle className="animate-spin" aria-hidden="true" />
            )}
            {contact ? "Guardar cambios" : "Agregar contacto"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
