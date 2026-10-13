// src/features/sales-control/components/header/cv-header-form.tsx
// Cabecera plegable del editor de CV: edita y guarda la versión en BORRADOR (AGENTS.md §5, Editor de CV).
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronDown, LoaderCircle } from "lucide-react";
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
import type { CvEditorHeader, CvFormOptions } from "../../types";
import { HeaderCommercial } from "./header-commercial";
import { HeaderGeneral } from "./header-general";

type Props = {
  header: CvEditorHeader;
  options: CvFormOptions;
  canEdit: boolean;
  maxFxDeviationPct: string;
};

type SaveState =
  | { kind: "idle" }
  | { kind: "saved" }
  | { kind: "error"; message: string };

export function CvHeaderForm({
  header,
  options,
  canEdit,
  maxFxDeviationPct,
}: Props) {
  const [isOpen, setIsOpen] = useState(true);
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
  }

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="rounded-xl border bg-card"
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
            disabled={!canEdit}
            customerName={header.customerName}
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
