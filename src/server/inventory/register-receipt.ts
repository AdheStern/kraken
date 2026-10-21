// src/server/inventory/register-receipt.ts
// Registra un ingreso (compra local, importación o inventario inicial) en un almacén: resuelve los productos por
// código y crea los que faltan para revisión, da de alta los seriales y valoriza cada línea (AGENTS.md §2.8).
import Decimal from "decimal.js";
import type { ReceiptLine } from "@/domain/inventory/parse-receipt-rows";
import { roundHalfUp2 } from "@/domain/pricing/money";
import type { ReceiptOrigin } from "@/generated/prisma/enums";
import { recordAudit } from "@/server/audit/record-audit";
import type { Tx } from "@/server/db";
import { InventoryStateError } from "./inventory-errors";
import { lockStocks } from "./lock-stocks";
import { type InvLineInput, postInvMovement } from "./post-inv-movement";
import { resolveInboundSerials } from "./serial-units";

export type ReceiptInput = {
  warehouseId: string;
  origin: ReceiptOrigin;
  documentRef: string | null;
  notes: string | null;
  idempotencyKey: string;
  lines: readonly ReceiptLine[];
};

export type ReceiptResult = { number: number; createdProducts: string[] };

type Product = { id: string; code: string; isSerialized: boolean };

const ONE = new Decimal(1);

export async function registerReceipt(
  tx: Tx,
  actorId: string,
  input: ReceiptInput,
): Promise<ReceiptResult> {
  const repeated = await tx.invMovement.findUnique({
    where: { idempotencyKey: input.idempotencyKey },
    select: { number: true },
  });
  if (repeated) return { number: repeated.number, createdProducts: [] };
  const warehouse = await tx.warehouse.findUniqueOrThrow({
    where: { id: input.warehouseId },
    select: { kind: true },
  });
  if (warehouse.kind === "TRANSITO")
    throw new InventoryStateError(
      "Al almacén de tránsito solo llegan traspasos.",
    );
  const { products, created } = await resolveProducts(tx, actorId, input.lines);
  const locked = await lockStocks(
    tx,
    [...products.values()].map((p) => ({
      warehouseId: input.warehouseId,
      productId: p.id,
    })),
  );
  const lines: InvLineInput[] = [];
  for (const line of input.lines) {
    const product = products.get(line.code) as Product;
    lines.push(...(await toInvLines(tx, product, line)));
  }
  const posted = await postInvMovement(tx, locked, {
    kind: "INGRESO",
    receiptOrigin: input.origin,
    warehouseId: input.warehouseId,
    actorId,
    documentRef: input.documentRef ?? undefined,
    notes: input.notes ?? undefined,
    idempotencyKey: input.idempotencyKey,
    lines,
  });
  return { number: posted.number, createdProducts: created };
}

// REGLA: un serializado entra con un serial por unidad; uno sin serial no lleva seriales (§2.8).
async function toInvLines(
  tx: Tx,
  product: Product,
  line: ReceiptLine,
): Promise<InvLineInput[]> {
  if (product.isSerialized !== line.serials.length > 0)
    throw new InventoryStateError(
      product.isSerialized
        ? `${product.code} es serializado: escribe un serial por unidad.`
        : `${product.code} no lleva serial: quita los seriales de la fila.`,
    );
  if (!product.isSerialized)
    return [
      {
        productId: product.id,
        direction: "IN",
        quantity: line.quantity,
        valueUsd: roundHalfUp2(line.unitCostUsd.mul(line.quantity)),
      },
    ];
  const ids = await resolveInboundSerials(tx, product.id, line.serials);
  return line.serials.map((serial) => ({
    productId: product.id,
    direction: "IN" as const,
    quantity: ONE,
    valueUsd: line.unitCostUsd,
    serialUnitId: ids.get(serial),
  }));
}

// POR QUÉ: el código se compara sin mayúsculas; un código nuevo crea el producto, serializado si trae seriales,
// y queda «por revisar» para Administración (decisión de DIMA, 2026-10-21).
async function resolveProducts(
  tx: Tx,
  actorId: string,
  lines: readonly ReceiptLine[],
) {
  const codes = [...new Set(lines.map((l) => l.code))];
  const found = await tx.product.findMany({
    where: { isActive: true, code: { in: codes, mode: "insensitive" } },
    select: { id: true, code: true, isSerialized: true },
  });
  const products = new Map<string, Product>();
  for (const product of found) {
    const key = product.code.toUpperCase();
    if (products.has(key))
      throw new InventoryStateError(
        `Hay dos productos activos con el código ${key}; Administración debe unificarlos.`,
      );
    products.set(key, product);
  }
  const created: string[] = [];
  for (const code of codes.filter((c) => !products.has(c))) {
    const line = lines.find((l) => l.code === code) as ReceiptLine;
    const product = await tx.product.create({
      data: {
        code,
        description: line.description || code,
        itemType: "HARDWARE",
        isSerialized: line.serials.length > 0,
        createdFromInventory: true,
      },
      select: { id: true, code: true, isSerialized: true },
    });
    await recordAudit(tx, {
      actorId,
      entity: "core.producto",
      entityId: product.id,
      action: "CREAR",
      after: {
        code,
        description: line.description || code,
        createdFromInventory: true,
      },
    });
    products.set(code, product);
    created.push(code);
  }
  return { products, created };
}
