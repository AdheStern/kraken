// src/server/sales-control/approvers.ts
// Quiénes pueden decidir cada solicitud de aprobación: gerentes activos del área y gerentes generales.
import type { ApprovalTarget } from "@/domain/sales-control/approval-round";
import type { Tx } from "@/server/db";

export type TargetApprovers = { target: ApprovalTarget; userIds: string[] };

export async function findApprovers(
  db: Tx,
  targets: readonly ApprovalTarget[],
): Promise<TargetApprovers[]> {
  const areaIds = targets.flatMap((t) => (t.kind === "AREA" ? [t.areaId] : []));
  const roles = await db.userRole.findMany({
    where: {
      user: { isActive: true },
      OR: [
        { role: { code: "GERENTE_AREA" }, areaId: { in: areaIds } },
        { role: { code: "GERENTE_GENERAL" } },
      ],
    },
    select: { userId: true, areaId: true, role: { select: { code: true } } },
  });
  return targets.map((target) => ({
    target,
    userIds: roles
      .filter((r) =>
        target.kind === "AREA"
          ? r.role.code === "GERENTE_AREA" && r.areaId === target.areaId
          : r.role.code === "GERENTE_GENERAL",
      )
      .map((r) => r.userId),
  }));
}

// TRAMPA: bloquea la fila de la versión para que dos decisiones simultáneas no vean la ronda a medias.
export async function lockVersion(tx: Tx, versionId: string): Promise<void> {
  await tx.$queryRaw`SELECT id FROM cv.version WHERE id = ${versionId}::uuid FOR UPDATE`;
}
