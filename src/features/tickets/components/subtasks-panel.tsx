// src/features/tickets/components/subtasks-panel.tsx
// Subtareas del ticket con su asignado y estado; quien gestiona el ticket las crea y las reasigna
// (AGENTS.md §2.6 "El encargado crea subtareas y las asigna").
"use client";

import { LoaderCircle, Plus } from "lucide-react";
import { useState } from "react";
import { PersonAvatar } from "@/components/app-shell/person-avatar";
import { CatalogCombobox } from "@/components/forms/catalog-combobox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OptionSelect } from "@/components/ui/option-select";
import type { SubtaskStatus } from "@/generated/prisma/enums";
import { createSubtask } from "../actions/create-subtask";
import { updateSubtask } from "../actions/update-subtask";
import { SUBTASK_STATUS_LABELS } from "../ticket-labels";
import type { Person, SubtaskView } from "../types";
import { useTicketAction } from "./use-ticket-action";

type Props = {
  ticketId: string;
  subtasks: SubtaskView[];
  engineers: Person[];
  canManage: boolean;
  viewerId: string;
};

const STATUS_OPTIONS = Object.entries(SUBTASK_STATUS_LABELS).map(
  ([id, label]) => ({ id, label }),
);

export function SubtasksPanel({
  ticketId,
  subtasks,
  engineers,
  canManage,
  viewerId,
}: Props) {
  const [title, setTitle] = useState("");
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const { run, isPending, error } = useTicketAction();
  const people = engineers.map((e) => ({ id: e.id, label: e.name }));

  async function add() {
    if (await run(() => createSubtask({ ticketId, title, assigneeId }))) {
      setTitle("");
      setAssigneeId(null);
    }
  }
  const setStatus = (subtaskId: string, status: string | null) =>
    status &&
    run(() => updateSubtask({ subtaskId, status: status as SubtaskStatus }));

  return (
    <div className="flex flex-col gap-4">
      {canManage && (
        <div className="kr-surface flex flex-col gap-2 rounded-xl p-4 sm:flex-row sm:items-center">
          <Input
            aria-label="Título de la subtarea"
            placeholder="Revisar el cableado del rack 2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <div className="sm:w-64">
            <CatalogCombobox
              id="subtask-assignee"
              options={people}
              value={assigneeId}
              onChange={setAssigneeId}
              placeholder="Asignar a…"
            />
          </div>
          <Button onClick={add} disabled={isPending || title.trim().length < 3}>
            {isPending ? (
              <LoaderCircle className="animate-spin" aria-hidden="true" />
            ) : (
              <Plus aria-hidden="true" />
            )}
            Agregar
          </Button>
        </div>
      )}
      {error && (
        <p
          role="alert"
          className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      )}
      {subtasks.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Sin subtareas. Divide el trabajo en subtareas para que cada ingeniero
          registre su tiempo en la suya.
        </p>
      ) : (
        <ul className="kr-solid divide-y divide-border/60 rounded-xl">
          {subtasks.map((s) => (
            <li
              key={s.id}
              className="flex flex-wrap items-center gap-3 px-4 py-3"
            >
              <span className="min-w-0 flex-1 text-sm font-medium">
                {s.title}
              </span>
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {s.assignee && (
                  <PersonAvatar
                    name={s.assignee.name}
                    image={s.assignee.image}
                    className="size-5 text-[10px]"
                  />
                )}
                {s.assignee?.name ?? "Sin asignar"}
              </span>
              <OptionSelect
                aria-label={`Estado de ${s.title}`}
                className="h-8 w-40"
                value={s.status}
                options={STATUS_OPTIONS}
                disabled={
                  isPending || !(canManage || s.assignee?.id === viewerId)
                }
                onValueChange={(v) => setStatus(s.id, v)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
