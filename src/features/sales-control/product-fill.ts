// src/features/sales-control/product-fill.ts
// Completa una línea con los datos de un producto del catálogo sin pisar lo que ya escribió el comercial.
import type { CvLineDraft } from "./schemas/cv-lines-schema";
import type { ProductOption } from "./types";

export function fillFromProduct(
  line: CvLineDraft,
  product: ProductOption,
): CvLineDraft {
  return {
    ...line,
    productId: product.id,
    code: product.code,
    description: line.description || product.description,
    technologyId: line.technologyId ?? product.technologyId,
    unitId: line.unitId ?? product.unitId,
    itemType: line.itemType ?? product.itemType,
  };
}
