// src/features/admin/actions/upsert-product.ts
// Crea o edita un producto del catálogo. Las líneas de CV ya guardadas conservan su código y descripción.
"use server";

import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import { toActionError } from "@/server/action-errors";
import { prisma } from "@/server/db";
import { guardAdmin } from "../admin-guard";
import { type ProductInput, productSchema } from "../schemas/product-schemas";

export async function upsertProduct(
  input: ProductInput,
): Promise<ActionResult<{ id: string }>> {
  const { denied } = await guardAdmin("commercial", "productos");
  if (denied) return denied;
  const parsed = productSchema.safeParse(input);
  if (!parsed.success)
    return actionError("VALIDATION", parsed.error.issues[0].message);
  const { id, ...data } = parsed.data;
  try {
    // POR QUÉ: el código no es único en la base (el CV crea productos al vuelo); aquí se evita repetirlo.
    const twin = await prisma.product.findFirst({
      where: {
        code: { equals: data.code, mode: "insensitive" },
        isActive: true,
        ...(id ? { id: { not: id } } : {}),
      },
      select: { description: true },
    });
    if (twin)
      return actionError(
        "CONFLICT",
        `El código ${data.code} ya es de «${twin.description}». Edita ese producto o usa otro código.`,
      );
    const saved = id
      ? await prisma.product.update({ where: { id }, data })
      : await prisma.product.create({ data });
    return actionOk({ id: saved.id });
  } catch (error) {
    return toActionError(error, "upsertProduct");
  }
}
