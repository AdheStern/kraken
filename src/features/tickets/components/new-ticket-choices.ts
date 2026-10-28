// src/features/tickets/components/new-ticket-choices.ts
// Opciones del alta de ticket que dependen de otros campos (proyectos del cliente, ingenieros de las áreas,
// bolsas que el ticket puede usar) y qué elecciones quedan inválidas cuando esos campos cambian.
import { bagIneligibility } from "@/domain/tickets/bag-eligibility";
import type { TicketFormOptions } from "../queries/get-ticket-form-options";
import type { CreateTicketInput } from "../schemas/ticket-schemas";

type Draft = Pick<
  CreateTicketInput,
  "customerId" | "areaIds" | "projectId" | "ownerId" | "bagId"
>;

export function ticketChoices(options: TicketFormOptions, draft: Draft) {
  return {
    projects: options.projects.filter((p) => p.customerId === draft.customerId),
    engineers: options.engineers.filter(
      (e) =>
        e.areaIds === null || e.areaIds.some((a) => draft.areaIds.includes(a)),
    ),
    // REGLA: la misma elegibilidad que valida el servidor (§2.6).
    bags: options.bags.filter((b) => !bagIneligibility(b, draft)),
  };
}

// TRAMPA: una elección que ya no está entre las opciones se ve vacía en su selector pero sigue en el formulario;
// hay que soltarla o el servidor la rechaza con un motivo que el usuario no ve en pantalla.
export function staleTicketChoices(
  options: TicketFormOptions,
  draft: Draft,
): ("projectId" | "ownerId" | "bagId")[] {
  const valid = ticketChoices(options, draft);
  const stale: ("projectId" | "ownerId" | "bagId")[] = [];
  if (draft.projectId && !valid.projects.some((p) => p.id === draft.projectId))
    stale.push("projectId");
  if (draft.ownerId && !valid.engineers.some((e) => e.id === draft.ownerId))
    stale.push("ownerId");
  if (draft.bagId && !valid.bags.some((b) => b.id === draft.bagId))
    stale.push("bagId");
  return stale;
}
