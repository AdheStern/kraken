// src/features/admin/queries/contact-view.ts
// Qué se lee de un puesto de contacto y cómo se presenta: municipio, sucursal, áreas, responsables y fechas
// (decisión 2026-11-06). Lo comparten la ficha del cliente y el directorio; la ficha suma los otros puestos activos de
// la persona (contacto compartido, decisión 2026-11-16).
import type { Prisma } from "@/generated/prisma/client";
import type { SessionUser } from "@/server/authz/roles";
import { scopeContactQuery } from "@/server/authz/scope-contact-query";
import type { ContactSibling, CustomerContactView } from "../types";

export const CONTACT_SELECT = {
  id: true,
  personId: true,
  name: true,
  position: true,
  email: true,
  phone: true,
  municipalityId: true,
  branchId: true,
  startedOn: true,
  endedOn: true,
  exitReason: true,
  isActive: true,
  municipality: {
    select: { name: true, department: { select: { name: true } } },
  },
  branch: { select: { name: true } },
  areas: { select: { area: { select: { id: true, code: true } } } },
  assignees: {
    select: {
      user: { select: { userId: true, user: { select: { name: true } } } },
    },
  },
} satisfies Prisma.CustomerContactSelect;

type Row = Prisma.CustomerContactGetPayload<{ select: typeof CONTACT_SELECT }>;

export function toContactView(
  row: Row,
  otherActive: ContactSibling[] = [],
): CustomerContactView {
  return {
    id: row.id,
    personId: row.personId,
    name: row.name,
    position: row.position,
    email: row.email,
    phone: row.phone,
    municipalityId: row.municipalityId,
    municipalityLabel: row.municipality
      ? `${row.municipality.name} (${row.municipality.department.name})`
      : null,
    branchId: row.branchId,
    branchName: row.branch?.name ?? null,
    areaIds: row.areas.map((a) => a.area.id),
    areaCodes: row.areas.map((a) => a.area.code),
    userIds: row.assignees.map((a) => a.user.userId),
    userNames: row.assignees.map((a) => a.user.user.name),
    startedOn: toDay(row.startedOn),
    endedOn: toDay(row.endedOn),
    exitReason: row.exitReason,
    isActive: row.isActive,
    otherActive,
  };
}

// REGLA: los otros puestos pasan por scopeContactQuery (regla 7); el grupo empresarial no da visibilidad.
export function siblingSelect(user: SessionUser) {
  return {
    person: {
      select: {
        positions: {
          where: { AND: [{ isActive: true }, scopeContactQuery(user)] },
          orderBy: { customer: { name: "asc" } },
          select: {
            id: true,
            customerId: true,
            email: true,
            phone: true,
            customer: { select: { name: true } },
          },
        },
      },
    },
  } satisfies Prisma.CustomerContactSelect;
}

type SiblingRow = Prisma.CustomerContactGetPayload<{
  select: ReturnType<typeof siblingSelect>;
}>;

export function toSiblings(row: SiblingRow & { id: string }): ContactSibling[] {
  return row.person.positions
    .filter((p) => p.id !== row.id)
    .map((p) => ({
      contactId: p.id,
      customerId: p.customerId,
      customerName: p.customer.name,
      email: p.email,
      phone: p.phone,
    }));
}

function toDay(date: Date | null): string | null {
  return date ? date.toISOString().slice(0, 10) : null;
}
