// src/features/tickets/components/ticket-request-dialog.tsx
// Diálogo para pedir un ticket: asunto, descripción y el área que debe atenderlo (AGENTS.md §2.6 «Solicitudes de
// ticket»).
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLayoutEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  CatalogCombobox,
  type CatalogOption,
} from "@/components/forms/catalog-combobox";
import { FormField } from "@/components/forms/form-field";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createTicketRequest } from "../actions/create-ticket-request";
import {
  type CreateTicketRequestInput,
  createTicketRequestSchema,
} from "../schemas/ticket-request-schemas";

const DEFAULTS: CreateTicketRequestInput = {
  areaId: "",
  title: "",
  description: "",
};

export function TicketRequestDialog({ areas }: { areas: CatalogOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useForm<CreateTicketRequestInput>({
    resolver: zodResolver(createTicketRequestSchema),
    defaultValues: DEFAULTS,
  });
  const { errors, isSubmitting } = form.formState;
  // TRAMPA: con Cache Components la página no se desmonta al navegar (<Activity>); sin esto, al volver el
  // diálogo sigue abierto.
  useLayoutEffect(() => () => setOpen(false), []);

  async function onSubmit(values: CreateTicketRequestInput) {
    setServerError(null);
    const result = await createTicketRequest(values);
    if (!result.ok) return setServerError(result.error.message);
    form.reset(DEFAULTS);
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus aria-hidden="true" />
        Nueva solicitud
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Pedir un ticket</DialogTitle>
          <DialogDescription>
            Un coordinador del área la revisa y crea el ticket. Te avisamos
            cuando lo empiecen a atender y cuando se resuelva.
          </DialogDescription>
        </DialogHeader>
        <form
          id="new-ticket-request"
          onSubmit={form.handleSubmit(onSubmit)}
          className="grid gap-4"
        >
          <FormField
            label="Área"
            htmlFor="request-area"
            error={errors.areaId?.message}
          >
            <Controller
              control={form.control}
              name="areaId"
              render={({ field }) => (
                <CatalogCombobox
                  id="request-area"
                  options={areas}
                  value={field.value || null}
                  onChange={(id) => field.onChange(id ?? "")}
                  invalid={!!errors.areaId}
                  placeholder="DIMANET, DIMAHELP…"
                />
              )}
            />
          </FormField>
          <FormField
            label="Asunto"
            htmlFor="request-title"
            error={errors.title?.message}
          >
            <Input
              id="request-title"
              placeholder="No puedo conectarme a la VPN"
              {...form.register("title")}
            />
          </FormField>
          <FormField
            label="Describe tu problema"
            htmlFor="request-description"
            error={errors.description?.message}
          >
            <Textarea
              id="request-description"
              rows={6}
              placeholder="Qué pasa, desde cuándo, a quién afecta y qué ya intentaste."
              {...form.register("description")}
            />
          </FormField>
        </form>
        {serverError && (
          <p
            role="alert"
            className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {serverError}
          </p>
        )}
        <DialogFooter>
          <Button
            type="submit"
            form="new-ticket-request"
            disabled={isSubmitting}
          >
            {isSubmitting && (
              <LoaderCircle className="animate-spin" aria-hidden="true" />
            )}
            {isSubmitting ? "Enviando…" : "Enviar solicitud"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
