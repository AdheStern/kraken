// src/features/search/queries/search-everything.ts
// Búsqueda global (Ctrl+K, decisión 2026-11-05): CV, tickets, productos, seriales, proyectos de documentación y
// clientes, hasta 5 por grupo. REGLA: cada grupo pasa por su alcance (regla 7) y solo aparece si el rol lo ve.
// POR QUÉ: el CV se busca por número y cliente, no por título: el título de un borrador no lo ve Administración.

import { canManageCommercialCatalogs } from "@/server/authz/admin-permissions";
import { canBrowseContacts } from "@/server/authz/contact-permissions";
import { canListCvs } from "@/server/authz/cv-permissions";
import { canUseDocumentation } from "@/server/authz/documentation-permissions";
import { canSeeInventory } from "@/server/authz/inventory-permissions";
import type { SessionUser } from "@/server/authz/roles";
import { scopeCustomerTicketQuery } from "@/server/authz/scope-customer-ticket-query";
import { scopeCvQuery } from "@/server/authz/scope-cv-query";
import { scopeDocProjectQuery } from "@/server/authz/scope-doc-project-query";
import { scopeTicketQuery } from "@/server/authz/scope-ticket-query";
import { canSeeTickets } from "@/server/authz/ticket-permissions";
import { prisma } from "@/server/db";
import type { SearchGroup, SearchItem } from "../types";
import { searchContacts } from "./search-contacts";

const TAKE = 5;

export async function searchEverything(
  user: SessionUser,
  query: string,
): Promise<SearchGroup[]> {
  const q = { contains: query, mode: "insensitive" as const };
  const groups: SearchGroup[] = [];
  if (user.customer) {
    groups.push(await tickets(user, query, q, true));
    return groups.filter((g) => g.items.length > 0);
  }
  if (canListCvs(user)) groups.push(await cvs(user, q));
  if (canSeeTickets(user)) groups.push(await tickets(user, query, q, false));
  if (canSeeInventory(user)) groups.push(...(await inventory(q)));
  if (canUseDocumentation(user)) groups.push(await docProjects(user, q));
  if (canManageCommercialCatalogs(user)) groups.push(await customers(q));
  if (canBrowseContacts(user)) groups.push(await searchContacts(user, query));
  return groups.filter((g) => g.items.length > 0);
}

type Match = { contains: string; mode: "insensitive" };

async function cvs(user: SessionUser, q: Match): Promise<SearchGroup> {
  const rows = await prisma.cv.findMany({
    where: {
      AND: [
        scopeCvQuery(user),
        { OR: [{ code: q }, { customer: { name: q } }] },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: TAKE,
    select: { id: true, code: true, customer: { select: { name: true } } },
  });
  return group(
    "Control de Venta",
    rows.map((r) => item(r.id, r.code, r.customer.name, `/cv/${r.id}`)),
  );
}

async function tickets(
  user: SessionUser,
  query: string,
  q: Match,
  isPortal: boolean,
): Promise<SearchGroup> {
  const number = /^#?\d+$/.test(query) ? Number(query.replace("#", "")) : null;
  const rows = await prisma.ticket.findMany({
    where: {
      AND: [
        isPortal ? scopeCustomerTicketQuery(user) : scopeTicketQuery(user),
        { OR: [{ title: q }, ...(number ? [{ number }] : [])] },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: TAKE,
    select: { id: true, number: true, title: true },
  });
  const base = isPortal ? "/cliente/tickets" : "/tickets";
  return group(
    "Tickets",
    rows.map((r) =>
      item(r.id, `#${r.number} ${r.title}`, null, `${base}/${r.id}`),
    ),
  );
}

async function inventory(q: Match): Promise<SearchGroup[]> {
  const products = await prisma.product.findMany({
    where: { isActive: true, OR: [{ code: q }, { description: q }] },
    orderBy: { code: "asc" },
    take: TAKE,
    select: { id: true, code: true, description: true },
  });
  const serials = await prisma.serialUnit.findMany({
    where: { serial: q },
    orderBy: { createdAt: "desc" },
    take: TAKE,
    select: { id: true, serial: true, product: { select: { code: true } } },
  });
  return [
    group(
      "Productos",
      products.map((p) =>
        item(
          p.id,
          p.code,
          p.description,
          `/inventario?q=${encodeURIComponent(p.code)}`,
        ),
      ),
    ),
    group(
      "Seriales",
      serials.map((s) =>
        item(
          s.id,
          s.serial,
          s.product.code,
          `/inventario/seriales?serial=${encodeURIComponent(s.serial)}`,
        ),
      ),
    ),
  ];
}

async function docProjects(user: SessionUser, q: Match): Promise<SearchGroup> {
  const rows = await prisma.docProject.findMany({
    where: {
      AND: [
        scopeDocProjectQuery(user),
        { OR: [{ name: q }, { customer: { name: q } }] },
      ],
    },
    orderBy: { name: "asc" },
    take: TAKE,
    select: { id: true, name: true, customer: { select: { name: true } } },
  });
  return group(
    "Documentación",
    rows.map((r) =>
      item(r.id, r.name, r.customer.name, `/documentacion/${r.id}`),
    ),
  );
}

async function customers(q: Match): Promise<SearchGroup> {
  const rows = await prisma.customer.findMany({
    where: { OR: [{ name: q }, { taxId: q }] },
    orderBy: { name: "asc" },
    take: TAKE,
    select: { id: true, name: true, taxId: true },
  });
  return group(
    "Clientes",
    rows.map((r) => item(r.id, r.name, r.taxId, `/admin/clientes/${r.id}`)),
  );
}

function group(label: string, items: SearchItem[]): SearchGroup {
  return { label, items };
}

function item(
  id: string,
  label: string,
  hint: string | null,
  href: string,
): SearchItem {
  return { id, label, hint, href };
}
