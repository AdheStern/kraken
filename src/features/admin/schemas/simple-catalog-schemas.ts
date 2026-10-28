// src/features/admin/schemas/simple-catalog-schemas.ts
// Entradas de los catálogos simples; el mismo zod valida el formulario y la action. Las reglas de cada
// catálogo (código, NIT, marca de horas) salen de su configuración.
import { z } from "zod";
import { SIMPLE_CATALOG_KINDS, SIMPLE_CATALOGS } from "../simple-catalogs";

const kindSchema = z.enum(SIMPLE_CATALOG_KINDS);
const optionalText = z
  .string()
  .trim()
  .max(40)
  .transform((value) => value || null)
  .nullable()
  .optional();

export const simpleCatalogItemSchema = z
  .object({
    kind: kindSchema,
    id: z.uuid().nullable(),
    name: z.string().trim().min(2, "Escribe un nombre.").max(120),
    code: z.string().trim().toUpperCase().optional(),
    taxId: optionalText,
    isHours: z.boolean().optional(),
    isTerm: z.boolean().optional(),
  })
  .superRefine((item, ctx) => {
    const code = SIMPLE_CATALOGS[item.kind].code;
    // REGLA: el código se fija al crear (simple-catalogs.ts); al editar se ignora.
    if (!code || item.id !== null) return;
    if (!item.code || !code.pattern.test(item.code))
      ctx.addIssue({
        code: "custom",
        path: ["code"],
        message: `Revisa el código: ${code.hint}`,
      });
  });

export type SimpleCatalogItemInput = z.input<typeof simpleCatalogItemSchema>;

export const simpleCatalogActiveSchema = z.object({
  kind: kindSchema,
  id: z.uuid(),
  isActive: z.boolean(),
});

export type SimpleCatalogActiveInput = z.input<
  typeof simpleCatalogActiveSchema
>;
