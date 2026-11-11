// src/features/sales-control/components/header/cv-header-form.tsx
// Cabecera plegable del editor de CV: la edita el comercial en el borrador y gerentes y Administración en cualquier
// estado, estos sin los TC (AGENTS.md §5 Editor de CV, §2.3).
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronDown, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { updateCvHeader } from "../../actions/update-cv-header";
import {
  type CvHeaderInput,
  cvHeaderSchema,
} from "../../schemas/cv-header-schema";
import type {
  CvContactOption,
  CvEditorHeader,
  CvFormOptions,
} from "../../types";
import { HeaderCommercial } from "./header-commercial";
import { HeaderGeneral } from "./header-general";

type Props = {
  header: CvEditorHeader;
  options: CvFormOptions;
  contacts: CvContactOption[];
  canEdit: boolean;
  fxLocked: boolean;
  maxFxDeviationPct: string;
  defaultOpen: boolean;
};

type SaveState =
  | { kind: "idle" }
  | { kind: "saved" }
  | { kind: "error"; message: string };

export function CvHeaderForm({
  header,
  options,
  contacts,
  canEdit,
  fxLocked,
  maxFxDeviationPct,
  defaultOpen,
}: Props) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [saveState, setSaveState] = useState<SaveState>({ kind: "idle" });
  const form = useForm<CvHeaderInput>({
    resolver: zodResolver(cvHeaderSchema),
    defaultValues: toFormValues(header),
  });
  const { isSubmitting, isDirty } = form.formState;

  async function onSubmit(values: CvHeaderInput) {
    const result = await updateCvHeader(values);
    if (!result.ok)
      return setSaveState({ kind: "error", message: result.error.message });
    form.reset(values);
    setSaveState({ kind: "saved" });
    // POR QUÉ: el TC guardado cambia los montos en Bs de la grilla, que se recalcula con datos del servidor.
    router.refresh();
  }

  return (
    <Collapsible
      data-tour="cv-cabecera"
      open={isOpen}
      onOpenChange={setIsOpen}
      className="kr-surface rounded-xl"
    >
      <CollapsibleTrigger className="flex w-full items-center gap-2 px-5 py-3.5 text-left text-sm font-semibold outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
        Cabecera
        <span className="font-normal text-muted-foreground">
          · cliente, personas, orden y tipo de cambio
        </span>
        <ChevronDown
          className="ml-auto size-4 transition-transform data-[open=true]:rotate-180"
          data-open={isOpen}
          aria-hidden="true"
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="grid gap-6 border-t px-5 py-5"
        >
          <HeaderGeneral form={form} options={options} disabled={!canEdit} />
          <HeaderCommercial
            form={form}
            options={options}
            contacts={contacts}
            disabled={!canEdit}
            fxLocked={fxLocked}
            customer={{
              name: header.customerName,
              taxId: header.customerTaxId,
              address: header.customerAddress,
            }}
            officialFxRate={header.officialFxRate}
            maxFxDeviationPct={maxFxDeviationPct}
          />
          {canEdit && (
            <div className="flex flex-wrap items-center justify-end gap-3 border-t pt-4">
              <p aria-live="polite" className="text-sm">
                {saveState.kind === "saved" && !isDirty && (
                  <span className="text-success">Cabecera guardada.</span>
                )}
                {saveState.kind === "error" && (
                  <span className="text-destructive">{saveState.message}</span>
                )}
                {isDirty && (
                  <span className="text-muted-foreground">
                    Hay cambios sin guardar.
                  </span>
                )}
              </p>
              <Button type="submit" disabled={isSubmitting || !isDirty}>
                {isSubmitting && (
                  <LoaderCircle className="animate-spin" aria-hidden="true" />
                )}
                {isSubmitting ? "Guardando…" : "Guardar cabecera"}
              </Button>
            </div>
          )}
        </form>
      </CollapsibleContent>
    </Collapsible>
  );
}

function toFormValues(header: CvEditorHeader): CvHeaderInput {
  const contact = header.snapshot?.customer;
  return {
    versionId: header.versionId,
    title: header.title,
    issuedOn: header.issuedOn,
    sellerIds: header.sellerIds,
    presalesId: header.presalesId,
    postsalesId: header.postsalesId,
    mainTechnologyId: header.mainTechnologyId,
    serviceTypeId: header.serviceTypeId,
    isNewTechnology: header.isNewTechnology,
    contactName: contact?.contactName ?? "",
    contactEmail: contact?.email ?? "",
    contactPhone: contact?.phone ?? "",
    contactAddress: contact?.address ?? header.customerAddress,
    endCustomerId: header.endCustomerId,
    customerPoNumber: header.customerPoNumber,
    customerPoDate: header.customerPoDate,
    paymentTerms: header.paymentTerms,
    deliveryOn: header.deliveryOn,
    notes: header.notes,
    costFxRate: header.costFxRate,
    saleFxRate: header.saleFxRate,
  };
}
