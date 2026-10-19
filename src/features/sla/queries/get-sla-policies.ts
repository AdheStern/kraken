// src/features/sla/queries/get-sla-policies.ts
// Grilla de políticas de SLA por modalidad y prioridad, con las que faltan vacías (AGENTS.md §2.7).
import { prisma } from "@/server/db";
import type { SlaPolicyRow } from "../types";

const MODALITIES = ["H8X5", "H24X7"] as const;
const PRIORITIES = ["CRITICA", "ALTA", "MEDIA", "BAJA"] as const;

export async function getSlaPolicies(): Promise<SlaPolicyRow[]> {
  const policies = await prisma.slaPolicy.findMany();
  return MODALITIES.flatMap((modality) =>
    PRIORITIES.map((priority) => {
      const found = policies.find(
        (p) => p.modality === modality && p.priority === priority,
      );
      return {
        modality,
        priority,
        firstResponseMinutes: found?.firstResponseMinutes ?? null,
        resolutionMinutes: found?.resolutionMinutes ?? null,
        isActive: found?.isActive ?? false,
      };
    }),
  );
}
