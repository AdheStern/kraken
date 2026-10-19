// src/features/tickets/components/new-ticket-dialog.tsx
// Diálogo para crear un ticket; al crearlo abre su detalle (AGENTS.md §2.6, §5).
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
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
import { createTicket } from "../actions/create-ticket";
import type { TicketFormOptions } from "../queries/get-ticket-form-options";
import {
  type CreateTicketInput,
  createTicketSchema,
} from "../schemas/ticket-schemas";
import { NewTicketFields } from "./new-ticket-fields";

const DEFAULTS: CreateTicketInput = {
  kind: "SOPORTE",
  customerId: "",
  cityId: "",
  areaIds: [],
  projectId: null,
  priority: "MEDIA",
  slaModality: "H8X5",
  title: "",
  description: "",
  ownerId: null,
};

export function NewTicketDialog({ options }: { options: TicketFormOptions }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useForm<CreateTicketInput>({
    resolver: zodResolver(createTicketSchema),
    defaultValues: DEFAULTS,
  });
  const { isSubmitting } = form.formState;

  async function onSubmit(values: CreateTicketInput) {
    setServerError(null);
    const result = await createTicket(values);
    if (!result.ok) return setServerError(result.error.message);
    router.push(`/tickets/${result.data.ticketId}`);
  }

  return (
    <Dialog>
      <DialogTrigger render={<Button />}>
        <Plus aria-hidden="true" />
        Nuevo ticket
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nuevo ticket</DialogTitle>
          <DialogDescription>
            El horario y los feriados que ponderan sus horas son los de la
            ciudad del ticket. Las bolsas se ordenan después, en el detalle.
          </DialogDescription>
        </DialogHeader>
        <form
          id="new-ticket"
          onSubmit={form.handleSubmit(onSubmit)}
          className="grid max-h-[65dvh] gap-4 overflow-y-auto px-0.5 sm:grid-cols-2"
        >
          <NewTicketFields form={form} options={options} />
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
          <Button type="submit" form="new-ticket" disabled={isSubmitting}>
            {isSubmitting && (
              <LoaderCircle className="animate-spin" aria-hidden="true" />
            )}
            {isSubmitting ? "Creando…" : "Crear ticket"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
