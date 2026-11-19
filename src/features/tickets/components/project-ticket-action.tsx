// src/features/tickets/components/project-ticket-action.tsx
// «Nuevo ticket» desde un proyecto: el alta abre con el proyecto, su cliente y sus áreas, y con su bolsa si
// tiene una sola que el ticket pueda usar (AGENTS.md §2.6 estructura).
import type { TicketFormOptions } from "../queries/get-ticket-form-options";
import type { ProjectDetailView } from "../types";
import { ticketChoices } from "./new-ticket-choices";
import { NewTicketDialog } from "./new-ticket-dialog";

type Props = { project: ProjectDetailView; options: TicketFormOptions };

export function ProjectTicketAction({ project, options }: Props) {
  // TRAMPA: solo las áreas del proyecto que el usuario gestiona; otra la rechazaría el servidor.
  const managed = new Set(options.areas.map((a) => a.id));
  const draft = {
    customerId: project.customerId,
    areaIds: project.areaIds.filter((id) => managed.has(id)),
    projectId: project.id,
    ownerId: null,
    bagId: null,
  };
  const { bags } = ticketChoices(options, draft);
  const own = bags.filter((b) => b.projectId === project.id);
  const single = own.length === 1 ? own : bags.length === 1 ? bags : [];
  return (
    <NewTicketDialog
      options={options}
      shortcut
      initialValues={{
        ...draft,
        kind: "PROYECTO",
        bagId: single[0]?.id ?? null,
        slaModality: single[0]?.modality ?? "H8X5",
      }}
    />
  );
}
