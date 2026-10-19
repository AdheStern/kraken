// src/domain/tickets/bag-eligibility.ts
// Qué bolsas puede usar un ticket en su jerarquía (AGENTS.md §2.4 alcance, §2.6 estructura).
import type { BagStatus } from "@/domain/hours/bag-state-machine";

export type EligibleBag = {
  customerId: string;
  status: BagStatus;
  scope: "AREA" | "PROYECTO" | "GENERAL";
  areaIds: readonly string[];
  projectId: string | null;
};

export type BagTicket = {
  customerId: string;
  areaIds: readonly string[];
  projectId: string | null;
};

// REGLA: solo bolsas ACTIVA del mismo cliente cuyo alcance incluya un área o el proyecto del ticket; una
// GENERAL sirve a cualquier ticket del cliente (§2.4, §2.6). Devuelve el motivo del rechazo o null.
export function bagIneligibility(
  bag: EligibleBag,
  ticket: BagTicket,
): string | null {
  if (bag.customerId !== ticket.customerId)
    return "La bolsa es de otro cliente.";
  if (bag.status !== "ACTIVA")
    return "La bolsa no está activa (agotada, vencida o cerrada).";
  if (
    bag.scope === "AREA" &&
    !bag.areaIds.some((areaId) => ticket.areaIds.includes(areaId))
  )
    return "La bolsa es de áreas que no tiene el ticket.";
  if (bag.scope === "PROYECTO" && bag.projectId !== ticket.projectId)
    return "La bolsa es de otro proyecto.";
  return null;
}
