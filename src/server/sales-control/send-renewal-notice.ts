// src/server/sales-control/send-renewal-notice.ts
// Un aviso de renovación por CV y umbral: registra los avisos del linaje y notifica a los vendedores y a los
// gerentes de las áreas de las líneas (AGENTS.md §2.1 "Vigencia", decisión 2026-11-05).
import { daysUntil } from "@/domain/dashboards/renewals";
import { toCvVersionLabel } from "@/domain/sales-control/cv-code";
import type { Tx } from "@/server/db";
import { notify } from "@/server/notifications/notify";
import type { RenewalLine } from "./load-renewal-lines";

export type DueRenewalLine = RenewalLine & { markDays: number[] };
export type DueRenewalGroup = { days: number; lines: DueRenewalLine[] };

const MAX_LISTED = 5;

export async function sendRenewalNotice(
  tx: Tx,
  group: DueRenewalGroup,
  today: string,
): Promise<void> {
  // TRAMPA: skipDuplicates hace idempotente un reintento del job que corrió a medias.
  await tx.cvRenewalNotice.createMany({
    data: group.lines.flatMap((line) =>
      line.markDays.map((days) => ({ originLineId: line.rootLineId, days })),
    ),
    skipDuplicates: true,
  });
  const [first] = group.lines;
  const areaIds = [
    ...new Set(group.lines.flatMap((l) => (l.areaId ? [l.areaId] : []))),
  ];
  const managers = await tx.userRole.findMany({
    where: {
      role: { code: "GERENTE_AREA" },
      areaId: { in: areaIds },
      user: { isActive: true },
    },
    select: { userId: true },
  });
  const label = toCvVersionLabel(first.cvCode, first.versionNumber);
  const daysLeft = Math.min(
    ...group.lines.map((l) => daysUntil(today, l.coverageEnd)),
  );
  const count = group.lines.length;
  await notify(tx, {
    event: "CV_RENOVACION",
    userIds: [...first.sellerIds, ...managers.map((m) => m.userId)],
    title: `${label}: ${count === 1 ? "una vigencia vence" : `${count} vigencias vencen`} ${daysLeft === 0 ? "hoy" : `en ${daysLeft} ${daysLeft === 1 ? "día" : "días"}`}`,
    body: `${first.customerName} · ${describeLines(group.lines)}. Prepara la renovación.`,
    link: `/cv/${first.cvId}`,
  });
}

function describeLines(lines: readonly DueRenewalLine[]): string {
  const listed = lines
    .slice(0, MAX_LISTED)
    .map((l) => `${l.description} (hasta ${toDayText(l.coverageEnd)})`);
  const rest = lines.length - listed.length;
  return rest > 0 ? `${listed.join("; ")} y ${rest} más` : listed.join("; ");
}

function toDayText(date: string): string {
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}
