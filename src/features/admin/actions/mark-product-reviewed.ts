// src/features/admin/actions/mark-product-reviewed.ts
// Da por revisado un producto creado desde el editor del CV: sale de la lista "por revisar" (AGENTS.md §2.1).
"use server";

import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import { toActionError } from "@/server/action-errors";
import { prisma } from "@/server/db";
import { guardAdmin } from "../admin-guard";
import {
  type ProductReviewInput,
  productReviewSchema,
} from "../schemas/product-schemas";

// LIMITACIÓN: la marca "creado desde CV" es la misma que "por revisar"; al revisarlo se pierde su origen.
export async function markProductReviewed(
  input: ProductReviewInput,
): Promise<ActionResult<null>> {
  const { denied } = await guardAdmin("commercial", "productos");
  if (denied) return denied;
  const parsed = productReviewSchema.safeParse(input);
  if (!parsed.success)
    return actionError("VALIDATION", parsed.error.issues[0].message);
  try {
    await prisma.product.update({
      where: { id: parsed.data.id },
      data: { createdFromCv: false },
    });
    return actionOk(null);
  } catch (error) {
    return toActionError(error, "markProductReviewed");
  }
}
