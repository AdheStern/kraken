// src/features/tickets/components/assign-owner-dialog.tsx
// Asigna o cambia el ingeniero encargado de un ticket (AGENTS.md §2.6 "Un solo ingeniero encargado").
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
import { assignOwner } from "../actions/assign-owner";
import type { Person } from "../types";
import { useTicketAction } from "./use-ticket-action";

type Props = { ticketId: string; ownerId: string | null; engineers: Person[] };

export function AssignOwnerDialog({ ticketId, ownerId, engineers }: Props) {
  const [open, setOpen] = useState(false);
  const [chosen, setChosen] = useState<string | null>(ownerId);
  const { run, isPending, error } = useTicketAction();
  const options = engineers.map((e) => ({ id: e.id, label: e.name }));

  async function confirm() {
    if (!chosen) return;
    if (await run(() => assignOwner({ ticketId, ownerId: chosen })))
      setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        {ownerId ? "Cambiar encargado" : "Asignar encargado"}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Encargado del ticket</DialogTitle>
          <DialogDescription>
            Un ingeniero de un área del ticket. Recibe un aviso y puede crear
            subtareas y ordenar las bolsas.
          </DialogDescription>
        </DialogHeader>
        {options.length > 0 ? (
          <CatalogCombobox
            id="ticket-owner"
            options={options}
            value={chosen}
            onChange={setChosen}
            placeholder="Nombre del ingeniero"
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            No hay ingenieros en las áreas de este ticket. Pide al administrador
            que asigne el rol en Administración → Usuarios.
          </p>
        )}
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
            disabled={isPending || !chosen || chosen === ownerId}
          >
            {isPending && (
              <LoaderCircle className="animate-spin" aria-hidden="true" />
            )}
            Asignar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
