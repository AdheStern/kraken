// src/features/admin/queries/find-contact-candidates.ts
// Puestos de contacto que podrían ser la misma persona que se va a crear: mismo correo, el teléfono termina igual
// o el nombre comparte su apellido (decisión 2026-11-06). findContactMatches decide; esto solo acota la búsqueda.
// LIMITACIÓN: con el alcance de quien crea (regla 7): un duplicado fuera de sus áreas no se avisa; lo unifica
// después quien gestiona contactos.

import type { MatchCandidate } from "@/domain/customers/contact-matching";
import {
  normalizeContactName,
  normalizeEmail,
  normalizePhone,
} from "@/domain/customers/contact-normalize";
import type { SessionUser } from "@/server/authz/roles";
import { scopeContactQuery } from "@/server/authz/scope-contact-query";
import { prisma } from "@/server/db";

const TAKE = 50;

export async function findContactCandidates(
  user: SessionUser,
  input: {
    name: string;
    email: string | null;
    phone: string | null;
  },
): Promise<MatchCandidate[]> {
  const email = normalizeEmail(input.email);
  const phone = normalizePhone(input.phone);
  const lastName = normalizeContactName(input.name).split(" ").at(-1) ?? "";
  const or = [
    ...(email
      ? [{ email: { equals: email, mode: "insensitive" as const } }]
      : []),
    ...(phone ? [{ phone: { contains: phone.slice(-7) } }] : []),
    ...(lastName.length >= 3
      ? [{ person: { normalizedName: { contains: lastName } } }]
      : []),
  ];
  if (or.length === 0) return [];
  const rows = await prisma.customerContact.findMany({
    where: { AND: [{ OR: or }, scopeContactQuery(user)] },
    take: TAKE,
    select: {
      id: true,
      personId: true,
      name: true,
      email: true,
      phone: true,
      position: true,
      isActive: true,
      customer: { select: { id: true, name: true } },
    },
  });
  return rows.map((r) => ({
    contactId: r.id,
    personId: r.personId,
    name: r.name,
    email: r.email,
    phone: r.phone,
    customerId: r.customer.id,
    customerName: r.customer.name,
    position: r.position,
    isActive: r.isActive,
  }));
}
