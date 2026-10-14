// src/features/admin/schemas/entra-group-schemas.ts
// Mapeo de un grupo de Entra ID a un rol (con su área si corresponde), AGENTS.md ADR-05 y §7 mapEntraGroup.
import { z } from "zod";
import { RoleCode } from "@/generated/prisma/enums";
import { roleAreaIssue } from "../role-area-rules";

export const entraGroupMappingSchema = z
  .object({
    entraGroupId: z
      .string()
      .trim()
      .toLowerCase()
      .pipe(
        z.uuid(
          "Pega el Id. de objeto del grupo (Entra ID → Grupos → el grupo → Información general).",
        ),
      ),
    groupName: z
      .string()
      .trim()
      .min(2, "Escribe el nombre del grupo, como aparece en Entra.")
      .max(120),
    role: z.enum(RoleCode, "Elige un rol."),
    areaId: z
      .string()
      .nullable()
      .transform((value) => value || null)
      .pipe(z.uuid().nullable()),
  })
  .superRefine((input, ctx) => {
    const issue = roleAreaIssue(input.role, input.areaId);
    if (issue)
      ctx.addIssue({ code: "custom", path: ["areaId"], message: issue });
  });

export type EntraGroupMappingInput = z.input<typeof entraGroupMappingSchema>;

export const unmapEntraGroupSchema = z.object({ id: z.uuid() });

export type UnmapEntraGroupInput = z.input<typeof unmapEntraGroupSchema>;
