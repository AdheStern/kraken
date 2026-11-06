// src/features/help/queries/list-visible-tours.ts
// Recorridos guiados que el rol puede repetir desde la ayuda, con la pantalla donde se abren (decisión 2026-11-05).
// REGLA: cada uno solo si el rol abre esa pantalla, con las mismas funciones de authz que el riel (§2.9).
import { visibleBoards } from "@/features/dashboards/queries/load-dashboard-context";
import { canBrowseContacts } from "@/server/authz/contact-permissions";
import { canApproveCvs, canListCvs } from "@/server/authz/cv-permissions";
import { canUseDocumentation } from "@/server/authz/documentation-permissions";
import { canSeeHourBags } from "@/server/authz/hour-bag-permissions";
import {
  canOperateInventory,
  canSeeInventory,
} from "@/server/authz/inventory-permissions";
import type { SessionUser } from "@/server/authz/roles";
import { canSeeTickets } from "@/server/authz/ticket-permissions";
import { TOURS, type TourId } from "../tours/tour-registry";

export type VisibleTour = {
  id: TourId;
  title: string;
  // Sin href, el recorrido es de una pantalla de detalle (un CV, un ticket) y se abre desde ella.
  href: string | null;
};

export function listVisibleTours(user: SessionUser): VisibleTour[] {
  if (user.customer) return [tour("cliente", "/cliente")];
  const [firstBoard] = visibleBoards(user);
  const candidates: [TourId, string | null, boolean][] = [
    ["inicio", "/inicio", true],
    ["tableros", firstBoard ? `/tableros/${firstBoard}` : null, !!firstBoard],
    ["cv-lista", "/cv", canListCvs(user)],
    ["cv-editor", null, canListCvs(user)],
    ["aprobaciones", "/aprobaciones", canApproveCvs(user)],
    ["tickets", "/tickets", canSeeTickets(user)],
    ["ticket-detalle", null, canSeeTickets(user)],
    ["horas", "/horas", canSeeHourBags(user)],
    ["inventario", "/inventario", canSeeInventory(user)],
    ["pos", "/inventario/pos", canOperateInventory(user)],
    ["ingreso", "/inventario/ingresos/nuevo", canOperateInventory(user)],
    ["documentacion", "/documentacion", canUseDocumentation(user)],
    ["contactos", "/clientes/contactos", canBrowseContacts(user)],
  ];
  return candidates.flatMap(([id, href, isVisible]) =>
    isVisible ? [tour(id, href)] : [],
  );
}

function tour(id: TourId, href: string | null): VisibleTour {
  return { id, title: TOURS[id].title, href };
}
