// src/features/admin/queries/list-parameters.ts
// Valor actual de cada parámetro editable, con quién y cuándo lo cambió por última vez.
// LIMITACIÓN: sin alcance por usuario; la página solo se abre con canManageSystem.
import { prisma } from "@/server/db";
import { PARAMETER_KEYS, parameterText } from "../parameter-definitions";
import type { ParameterView } from "../types";

export async function listParameters(): Promise<ParameterView[]> {
  const rows = await prisma.parameter.findMany({
    where: { key: { in: [...PARAMETER_KEYS] } },
    select: {
      key: true,
      value: true,
      updatedAt: true,
      updatedBy: { select: { user: { select: { name: true } } } },
    },
  });
  const byKey = new Map(rows.map((r) => [r.key, r]));
  return PARAMETER_KEYS.map((key) => {
    const row = byKey.get(key);
    return {
      key,
      text: parameterText(row?.value),
      updatedAt: row?.updatedBy ? row.updatedAt.toISOString() : null,
      updatedBy: row?.updatedBy?.user.name ?? null,
    };
  });
}
