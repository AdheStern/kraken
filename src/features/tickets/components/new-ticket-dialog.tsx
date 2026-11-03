// src/features/tickets/components/new-ticket-dialog.tsx
// Diálogo para crear un ticket; al crearlo abre su detalle y el siguiente alta empieza en blanco. Desde una solicitud
// abre prellenado con ella. Los adjuntos elegidos se suben al crearlo (AGENTS.md §2.6, §5, ADR-16).
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLayoutEffect, useState } from "react";
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
import { uploadTicketAttachment } from "../actions/upload-ticket-attachment";
import type { TicketFormOptions } from "../queries/get-ticket-form-options";
import {
  type CreateTicketInput,
  createTicketSchema,
} from "../schemas/ticket-schemas";
import { NewTicketFields } from "./new-ticket-fields";
import { hasOversizedFiles, NewTicketFiles } from "./new-ticket-files";

const DEFAULTS: CreateTicketInput = {
  kind: "SOPORTE",
  customerId: "",
  cityId: "",
  areaIds: [],
  projectId: null,
  bagId: null,
  priority: "MEDIA",
  slaModality: "H8X5",
  title: "",
  description: "",
  ownerId: null,
  requestId: null,
};

type Props = {
  options: TicketFormOptions;
  // POR QUÉ: la solicitud aporta asunto, descripción, área, ciudad y su id; el resto lo decide quien atiende.
  initialValues?: Partial<CreateTicketInput>;
  triggerLabel?: string;
};

export function NewTicketDialog({
  options,
  initialValues,
  triggerLabel = "Nuevo ticket",
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const defaults = { ...DEFAULTS, ...initialValues };
  const form = useForm<CreateTicketInput>({
    resolver: zodResolver(createTicketSchema),
    defaultValues: defaults,
  });
  const { isSubmitting } = form.formState;
  // TRAMPA: con Cache Components la página no se desmonta al navegar (<Activity>); sin esto, al volver el
  // diálogo sigue abierto. El borrador se conserva hasta que se crea el ticket.
  useLayoutEffect(() => () => setOpen(false), []);

  async function onSubmit(values: CreateTicketInput) {
    setServerError(null);
    if (hasOversizedFiles(files))
      return setServerError("Quita los archivos de más de 20 MB.");
    const result = await createTicket(values);
    if (!result.ok) return setServerError(result.error.message);
    const { ticketId } = result.data;
    const failed = await uploadAll(ticketId, files);
    form.reset(defaults);
    setFiles([]);
    setOpen(false);
    // POR QUÉ: el ticket ya existe; lo que no subió se reintenta desde su pestaña Adjuntos, que lo avisa.
    router.push(
      failed.length > 0
        ? `/tickets/${ticketId}?adjuntosFallidos=${encodeURIComponent(failed.join(", "))}`
        : `/tickets/${ticketId}`,
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button size={initialValues ? "sm" : "default"} />}
      >
        <Plus aria-hidden="true" />
        {triggerLabel}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nuevo ticket</DialogTitle>
          <DialogDescription>
            El horario y los feriados que ponderan sus horas son los de la
            ciudad del ticket. Si eliges una bolsa, el SLA toma su modalidad.
          </DialogDescription>
        </DialogHeader>
        <form
          id="new-ticket"
          onSubmit={form.handleSubmit(onSubmit)}
          className="grid max-h-[65dvh] gap-4 overflow-x-hidden overflow-y-auto px-0.5 sm:grid-cols-2"
        >
          <NewTicketFields form={form} options={options} />
          {options.filesEnabled && (
            <NewTicketFiles files={files} onChange={setFiles} />
          )}
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
            {isSubmitting
              ? files.length > 0
                ? "Creando y subiendo…"
                : "Creando…"
              : "Crear ticket"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

async function uploadAll(ticketId: string, files: File[]): Promise<string[]> {
  const failed: string[] = [];
  // TRAMPA: en serie; varios archivos de 20 MB en paralelo saturan la subida y el límite de la action.
  for (const file of files) {
    const form = new FormData();
    form.set("ticketId", ticketId);
    form.set("file", file);
    const result = await uploadTicketAttachment(form);
    if (!result.ok) failed.push(file.name);
  }
  return failed;
}
