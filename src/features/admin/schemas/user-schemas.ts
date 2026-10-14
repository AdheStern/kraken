// src/features/admin/schemas/user-schemas.ts
// Entradas de la gestión de usuarios: perfil (ciudad, cargo), estado y roles asignados a mano (§1, §2.9).
import { z } from "zod";
import { RoleCode } from "@/generated/prisma/enums";
import { roleAreaIssue } from "../role-area-rules";

const optionalId = z
  .string()
  .nullable()
  .transform((value) => value || null)
  .pipe(z.uuid().nullable());

export const userProfileSchema = z.object({
  userId: z.string().min(1),
  cityId: optionalId,
  jobTitle: z
    .string()
    .trim()
    .max(120)
    .transform((value) => value || null),
});

export type UserProfileInput = z.input<typeof userProfileSchema>;

export const userActiveSchema = z.object({
  userId: z.string().min(1),
  isActive: z.boolean(),
});

export type UserActiveInput = z.input<typeof userActiveSchema>;

export const grantUserRoleSchema = z
  .object({
    userId: z.string().min(1),
    role: z.enum(RoleCode, "Elige un rol."),
    areaId: optionalId,
  })
  .superRefine((input, ctx) => {
    const issue = roleAreaIssue(input.role, input.areaId);
    if (issue)
      ctx.addIssue({ code: "custom", path: ["areaId"], message: issue });
  });

export type GrantUserRoleInput = z.input<typeof grantUserRoleSchema>;

export const revokeUserRoleSchema = z.object({ userRoleId: z.uuid() });

export type RevokeUserRoleInput = z.input<typeof revokeUserRoleSchema>;
