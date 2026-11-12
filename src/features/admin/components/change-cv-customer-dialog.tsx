// src/features/admin/components/change-cv-customer-dialog.tsx
// Diálogo para elegir el cliente nuevo de un CV y el motivo del cambio (§2.3, decisión 2026-11-12).
"use client";

import { LoaderCircle } from "lucide-react";
import { useState } from "react";
import { CatalogCombobox } from "@/components/forms/catalog-combobox";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { changeCvCustomer } from "../actions/change-cv-customer";
import type { CustomerChoice, CvCustomerRow } from "../cv-customer-types";
import { useAdminAction } from "./use-admin-action";

type Props = { cv: CvCustomerRow; customers: CustomerChoice[] };

export function ChangeCvCustomerDialog({ cv, customers }: Props) {
  const [open, setOpen] = useState(false);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const { isPending, error, setError, run } = useAdminAction();
  const options = customers.filter((c) => c.id !== cv.customer.id);

  async function confirm() {
    const done = await run(() =>
      changeCvCustomer({ cvId: cv.id, customerId: customerId ?? "", reason }),
    );
    if (!done) return;
    setOpen(false);
    setCustomerId(null);
    setReason("");
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setError(null);
      }}
    >
      <DialogTrigger
        render={
          <Button size="sm" variant="outline">
            Cambiar cliente
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cambiar el cliente de {cv.code}</DialogTitle>
          <DialogDescription>
            Pasa de «{cv.customer.name}» al cliente que elijas, en todas sus
            versiones. El NIT y la dirección pasan a ser los del cliente nuevo y
            el contacto queda por elegir en la cabecera.
            {cv.bagCount > 0 &&
              ` Sus ${cv.bagCount} ${cv.bagCount === 1 ? "bolsa de horas pasa" : "bolsas de horas pasan"} también al cliente nuevo.`}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-1.5 text-[13px] text-muted-foreground">
          <Label htmlFor={`cv-customer-${cv.id}`} className="font-normal">
            Cliente nuevo
          </Label>
          <CatalogCombobox
            id={`cv-customer-${cv.id}`}
            options={options}
            value={customerId}
            onChange={setCustomerId}
            placeholder="Busca por razón social o NIT"
          />
        </div>
        <Label className="grid gap-1.5 text-[13px] font-normal text-muted-foreground">
          Motivo (queda en la auditoría)
          <Textarea
            rows={3}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </Label>
        {error && (
          <p
            role="alert"
            className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </p>
        )}
        <DialogFooter>
          <Button
            onClick={confirm}
            disabled={isPending || !customerId || reason.trim().length < 5}
          >
            {isPending && (
              <LoaderCircle className="animate-spin" aria-hidden="true" />
            )}
            Cambiar cliente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
