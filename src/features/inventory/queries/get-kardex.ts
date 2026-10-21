// src/features/inventory/queries/get-kardex.ts
// Kardex de un producto en un almacén (AGENTS.md §2.8): cada línea con su costo, el saldo tras ella y el
// documento de origen. Solo para quien ve costos (scopeInvMovementQuery); para los demás, null.
import Decimal from "decimal.js";
import { roundHalfUp2 } from "@/domain/pricing/money";
import { canSeeInventoryCosts } from "@/server/authz/inventory-permissions";
import type { SessionUser } from "@/server/authz/roles";
import { scopeInvMovementQuery } from "@/server/authz/scope-inv-movement-query";
import { prisma } from "@/server/db";
import type { KardexEntry, KardexView } from "../types";
import { listStock } from "./list-stock";
import { toKardexDocument } from "./to-kardex-document";

// LIMITACIÓN: muestra las 300 líneas más recientes; el saldo de cada una es exacto igual.
const MAX_LINES = 300;

export async function getKardex(
  user: SessionUser,
  warehouseCode: string,
  productId: string,
): Promise<KardexView | null> {
  if (!canSeeInventoryCosts(user)) return null;
  const [warehouse, product] = await Promise.all([
    prisma.warehouse.findUnique({
      where: { code: warehouseCode },
      select: { id: true, code: true, name: true, kind: true },
    }),
    prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, code: true, description: true, isSerialized: true },
    }),
  ]);
  if (!warehouse || !product) return null;
  const [stock] = await listStock(user, {
    warehouseId: warehouse.id,
    isTransit: warehouse.kind === "TRANSITO",
    search: product.code,
  }).then((rows) => rows.filter((r) => r.productId === product.id));
  const lines = await prisma.invMovementLine.findMany({
    where: {
      productId,
      movement: {
        AND: [scopeInvMovementQuery(user), { warehouseId: warehouse.id }],
      },
    },
    orderBy: [{ movement: { number: "desc" } }, { id: "desc" }],
    take: MAX_LINES,
    select: LINE_SELECT,
  });
  return {
    warehouse,
    product,
    stock: stock ?? emptyStock(product),
    entries: lines.reverse().map(toEntry),
  };
}

const LINE_SELECT = {
  id: true,
  quantity: true,
  valueUsd: true,
  balanceQuantity: true,
  balanceValueUsd: true,
  serialUnit: { select: { serial: true } },
  movement: {
    select: {
      number: true,
      kind: true,
      receiptOrigin: true,
      createdAt: true,
      documentRef: true,
      notes: true,
      adjustmentRequestId: true,
      cvLine: {
        select: {
          version: {
            select: { number: true, cv: { select: { id: true, code: true } } },
          },
        },
      },
      ticket: { select: { id: true, number: true } },
      transfer: { select: { number: true } },
      actor: { select: { user: { select: { name: true } } } },
    },
  },
} as const;

type Line = Awaited<
  ReturnType<
    typeof prisma.invMovementLine.findMany<{ select: typeof LINE_SELECT }>
  >
>[number];

function toEntry(line: Line): KardexEntry {
  const quantity = new Decimal(line.quantity.toString());
  const value = new Decimal(line.valueUsd.toString());
  return {
    lineId: line.id,
    createdAt: line.movement.createdAt.toISOString(),
    movementNumber: line.movement.number,
    movementKind: line.movement.kind,
    receiptOrigin: line.movement.receiptOrigin,
    quantity: quantity.toFixed(2),
    unitCostUsd: roundHalfUp2(value.div(quantity).abs()).toFixed(2),
    valueUsd: value.toFixed(2),
    balanceQuantity: new Decimal(line.balanceQuantity.toString()).toFixed(2),
    balanceValueUsd: new Decimal(line.balanceValueUsd.toString()).toFixed(2),
    serial: line.serialUnit?.serial ?? null,
    document: toKardexDocument(line.movement),
    notes: line.movement.notes,
    actorName: line.movement.actor.user.name,
  };
}

function emptyStock(product: {
  id: string;
  code: string;
  description: string;
  isSerialized: boolean;
}) {
  return {
    productId: product.id,
    productCode: product.code,
    description: product.description,
    isSerialized: product.isSerialized,
    quantity: "0.00",
    reservedQuantity: "0.00",
    availableQuantity: "0.00",
    valueUsd: "0.00",
    averageCostUsd: null,
  };
}
