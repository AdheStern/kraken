// src/features/tickets/queries/get-ticket-form-options.ts
// Catálogos del alta de ticket: clientes, ciudades, las áreas que el usuario gestiona, proyectos activos,
// ingenieros con sus áreas y bolsas activas (AGENTS.md §2.6, §2.9).

import { toCvVersionLabel } from "@/domain/sales-control/cv-code";
import type { EligibleBag } from "@/domain/tickets/bag-eligibility";
import type { BagModality } from "@/generated/prisma/enums";
import { formatMinutes } from "@/lib/format-minutes";
import type { SessionUser } from "@/server/authz/roles";
import { scopeHourBagQuery } from "@/server/authz/scope-hour-bag-query";
import { ticketAreasManagedBy } from "@/server/authz/ticket-permissions";
import { prisma } from "@/server/db";
import { MODALITY_LABELS } from "../ticket-labels";

export type TicketOption = { id: string; label: string; hint?: string };

export type TicketFormOptions = {
  customers: TicketOption[];
  cities: TicketOption[];
  areas: TicketOption[];
  projects: (TicketOption & { customerId: string })[];
  // POR QUÉ: areaIds null = ingeniero sin área, elegible en cualquier ticket (§2.6, isTicketEngineer).
  engineers: (TicketOption & { areaIds: string[] | null })[];
  // POR QUÉ: el formulario filtra por cliente, áreas y proyecto con la misma regla del servidor (bagIneligibility).
  bags: (TicketOption & EligibleBag & { modality: BagModality })[];
};

export async function getTicketFormOptions(
  user: SessionUser,
): Promise<TicketFormOptions> {
  const managed = ticketAreasManagedBy(user);
  const active = { isActive: true };
  const [customers, cities, areas, projects, engineers, bags] =
    await Promise.all([
      prisma.customer.findMany({ where: active, orderBy: { name: "asc" } }),
      prisma.city.findMany({ where: active, orderBy: { code: "asc" } }),
      prisma.area.findMany({
        where: { ...active, ...(managed && { id: { in: managed } }) },
        orderBy: { code: "asc" },
      }),
      prisma.project.findMany({
        where: { status: "ACTIVO" },
        orderBy: { name: "asc" },
      }),
      prisma.userRole.findMany({
        where: { role: { code: "INGENIERO" }, user: active },
        select: {
          userId: true,
          areaId: true,
          user: { select: { user: { select: { name: true } } } },
        },
      }),
      listActiveBags(user),
    ]);
  return {
    customers: customers.map((c) => ({
      id: c.id,
      label: c.name,
      hint: c.taxId ?? undefined,
    })),
    cities: cities.map((c) => ({ id: c.id, label: c.name, hint: c.code })),
    areas: areas.map((a) => ({ id: a.id, label: a.code, hint: a.name })),
    projects: projects.map((p) => ({
      id: p.id,
      label: p.name,
      customerId: p.customerId,
    })),
    engineers: groupEngineers(engineers),
    bags,
  };
}

async function listActiveBags(user: SessionUser) {
  const bags = await prisma.hourBag.findMany({
    where: { AND: [scopeHourBagQuery(user), { status: "ACTIVA" }] },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      customerId: true,
      status: true,
      scope: true,
      projectId: true,
      modality: true,
      balanceMinutes: true,
      areas: { select: { areaId: true } },
      cvLine: {
        select: {
          description: true,
          version: { select: { number: true, cv: { select: { code: true } } } },
        },
      },
    },
  });
  return bags.map(({ areas, cvLine, balanceMinutes, ...bag }) => ({
    ...bag,
    areaIds: areas.map((a) => a.areaId),
    label: `${toCvVersionLabel(cvLine.version.cv.code, cvLine.version.number)} · ${cvLine.description}`,
    hint: `${MODALITY_LABELS[bag.modality]} · ${formatMinutes(balanceMinutes)}`,
  }));
}

function groupEngineers(
  roles: {
    userId: string;
    areaId: string | null;
    user: { user: { name: string } };
  }[],
) {
  const byUser = new Map<string, TicketOption & { areaIds: string[] | null }>();
  for (const role of roles) {
    const entry = byUser.get(role.userId) ?? {
      id: role.userId,
      label: role.user.user.name,
      areaIds: [],
    };
    if (role.areaId === null) entry.areaIds = null;
    else entry.areaIds?.push(role.areaId);
    byUser.set(role.userId, entry);
  }
  return [...byUser.values()].sort((a, b) =>
    a.label.localeCompare(b.label, "es"),
  );
}
