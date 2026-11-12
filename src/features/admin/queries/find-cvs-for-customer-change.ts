// src/features/admin/queries/find-cvs-for-customer-change.ts
// CV por número o cliente para corregir su cliente (§2.3, decisión 2026-11-12), con scopeCvCustomerChangeQuery.
// REGLA: solo cabecera; nunca montos, el administrador del sistema no los ve (§2.9).
import type { CvVersionStatus } from "@/generated/prisma/enums";
import type { SessionUser } from "@/server/authz/roles";
import { scopeCvCustomerChangeQuery } from "@/server/authz/scope-cv-customer-change-query";
import { prisma } from "@/server/db";
import type { CustomerChoice, CvCustomerRow } from "../cv-customer-types";

const LIMIT = 20;
const STATUS_LABEL: Record<CvVersionStatus, string> = {
  BORRADOR: "Borrador",
  EN_APROBACION: "En aprobación",
  OBSERVADA: "Observada",
  APROBADA: "Aprobada",
  REEMPLAZADA: "Reemplazada",
  ANULADA: "Anulada",
};

export async function findCvsForCustomerChange(
  user: SessionUser,
  search: string,
): Promise<CvCustomerRow[]> {
  const q = search.trim();
  if (q === "") return [];
  const rows = await prisma.cv.findMany({
    where: {
      AND: [
        scopeCvCustomerChangeQuery(user),
        {
          OR: [
            { code: { contains: q, mode: "insensitive" } },
            { customer: { name: { contains: q, mode: "insensitive" } } },
          ],
        },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: LIMIT,
    select: {
      id: true,
      code: true,
      voidedAt: true,
      customer: { select: { id: true, name: true, taxId: true } },
      versions: {
        orderBy: { number: "desc" },
        take: 1,
        select: { number: true, title: true, status: true },
      },
    },
  });
  const usage = await bagUsage(rows.map((r) => r.id));
  return rows.map((row) => {
    const latest = row.versions[0];
    const use = usage.get(row.id);
    return {
      id: row.id,
      code: row.code,
      title: latest?.title ?? null,
      versionNumber: latest?.number ?? null,
      statusLabel: latest ? STATUS_LABEL[latest.status] : "Sin versión",
      isVoided: row.voidedAt !== null,
      customer: row.customer,
      bagCount: use?.bags ?? 0,
      usedBagNotice: use?.used
        ? "Sus bolsas de horas ya se usan en tickets: el cliente no se puede cambiar."
        : null,
    };
  });
}

export async function listActiveCustomerChoices(): Promise<CustomerChoice[]> {
  const customers = await prisma.customer.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, taxId: true },
  });
  return customers.map((c) => ({
    id: c.id,
    label: c.name,
    hint: c.taxId ?? undefined,
  }));
}

async function bagUsage(cvIds: string[]) {
  const bags = await prisma.hourBag.findMany({
    where: { cvLine: { version: { cvId: { in: cvIds } } } },
    select: {
      cvLine: { select: { version: { select: { cvId: true } } } },
      _count: {
        select: {
          ticketBags: true,
          movements: { where: { kind: { in: ["CONSUMO", "REVERSO"] } } },
        },
      },
    },
  });
  const usage = new Map<string, { bags: number; used: boolean }>();
  for (const bag of bags) {
    const cvId = bag.cvLine.version.cvId;
    const current = usage.get(cvId) ?? { bags: 0, used: false };
    const used = bag._count.ticketBags > 0 || bag._count.movements > 0;
    usage.set(cvId, { bags: current.bags + 1, used: current.used || used });
  }
  return usage;
}
