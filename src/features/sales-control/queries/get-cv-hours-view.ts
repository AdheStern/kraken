// src/features/sales-control/queries/get-cv-hours-view.ts
// Vista de un CV para el ingeniero: cabecera y líneas de horas de la versión aprobada, con su bolsa; nunca montos
// (AGENTS.md §2.9 "CV: ver" del ingeniero, regla 12). null si el CV no es de sus tickets.
import { toCvVersionLabel } from "@/domain/sales-control/cv-code";
import type { SessionUser } from "@/server/authz/roles";
import { scopeCvHoursQuery } from "@/server/authz/scope-cv-hours-query";
import { prisma } from "@/server/db";
import { parseHourBagSpec } from "../line-details";
import type { CvHoursView } from "../types";

export async function getCvHoursView(
  user: SessionUser,
  cvId: string,
): Promise<CvHoursView | null> {
  const cv = await prisma.cv.findFirst({
    where: { AND: [{ id: cvId }, scopeCvHoursQuery(user)] },
    select: {
      code: true,
      city: { select: { name: true } },
      customer: { select: { name: true } },
      versions: {
        where: { status: "APROBADA" },
        take: 1,
        select: {
          number: true,
          title: true,
          sellers: {
            select: { user: { select: { user: { select: { name: true } } } } },
          },
          // REGLA: solo líneas de horas o contratos por vigencia, sin costo, factor ni precio (regla 12).
          lines: {
            where: {
              itemType: "SERVICIO",
              OR: [
                { unit: { isHours: true } },
                { hourBag: { kind: "VIGENCIA" } },
              ],
            },
            orderBy: { position: "asc" },
            select: {
              id: true,
              description: true,
              quantity: true,
              hourBagSpec: true,
              coverageEnd: true,
              area: { select: { code: true } },
              hourBag: {
                select: {
                  id: true,
                  status: true,
                  balanceMinutes: true,
                  isUncapped: true,
                  kind: true,
                },
              },
            },
          },
        },
      },
    },
  });
  const version = cv?.versions[0];
  if (!cv || !version) return null;
  return {
    label: toCvVersionLabel(cv.code, version.number),
    title: version.title,
    customerName: cv.customer.name,
    cityName: cv.city.name,
    sellerNames: version.sellers.map((s) => s.user.user.name),
    lines: version.lines.map((line) => {
      const spec = parseHourBagSpec(line.hourBagSpec);
      const isContract = line.hourBag?.kind === "VIGENCIA";
      const bag = line.hourBag && {
        id: line.hourBag.id,
        status: line.hourBag.status,
        balanceMinutes: line.hourBag.balanceMinutes,
        isUncapped: line.hourBag.isUncapped,
      };
      return {
        id: line.id,
        description: line.description,
        hours: isContract
          ? (spec?.capHours ?? null)
          : (line.quantity?.toString() ?? "0"),
        isContract,
        areaCode: line.area?.code ?? null,
        modality: spec?.modality ?? null,
        expiresOn: isContract
          ? (line.coverageEnd?.toISOString().slice(0, 10) ?? null)
          : spec?.expiresOn || null,
        bag,
      };
    }),
  };
}
