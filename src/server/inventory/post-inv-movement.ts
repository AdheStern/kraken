// src/server/inventory/post-inv-movement.ts
// Único camino para mover stock: valoriza cada línea, escribe el movimiento inmutable con el saldo tras cada
// línea (kardex) y actualiza la caché del stock y los seriales en la misma transacción (AGENTS.md §0.6, ADR-03).
import type Decimal from "decimal.js";
import {
  applyInbound,
  applyOutbound,
  applyOutboundAtValue,
  type ValuedEntry,
} from "@/domain/inventory/stock-valuation";
import type { InvMovementKind, ReceiptOrigin } from "@/generated/prisma/enums";
import type { Tx } from "@/server/db";
import {
  InsufficientStockError,
  InventoryStateError,
} from "./inventory-errors";
import {
  type LockedStock,
  type LockedStocks,
  lockedStock,
} from "./lock-stocks";
import { type LockedSerial, lockSerialUnits, moveSerial } from "./serial-units";

// POR QUÉ: en una entrada el valor es obligatorio; en una salida, si falta, sale al promedio (§2.8). Una salida
// con valor fijo es la de TRANSITO, que vale lo que envió su traspaso.
export type InvLineInput = {
  productId: string;
  direction: "IN" | "OUT";
  quantity: Decimal;
  valueUsd?: Decimal;
  serialUnitId?: string;
  returnsLineId?: string;
  transferLineId?: string;
};

export type InvMovementInput = {
  kind: InvMovementKind;
  warehouseId: string;
  actorId: string;
  receiptOrigin?: ReceiptOrigin;
  documentRef?: string;
  cvLineId?: string;
  ticketId?: string;
  transferId?: string;
  adjustmentRequestId?: string;
  notes?: string;
  idempotencyKey?: string;
  lines: readonly InvLineInput[];
};

export type PostedInvLine = {
  lineId: string;
  productId: string;
  quantity: Decimal;
  valueUsd: Decimal;
};

export type PostedInvMovement = {
  movementId: string;
  number: number;
  lines: PostedInvLine[];
};

type Product = { code: string; isSerialized: boolean };

// REGLA: el llamador bloqueó antes, con lockStocks, todo el stock que toca la operación entera.
export async function postInvMovement(
  tx: Tx,
  locked: LockedStocks,
  input: InvMovementInput,
): Promise<PostedInvMovement> {
  const { lines: inputLines, ...header } = input;
  if (inputLines.length === 0)
    throw new RangeError("Un movimiento necesita al menos una línea.");
  if (inputLines.some((l) => l.quantity.lessThanOrEqualTo(0)))
    throw new RangeError("Cada línea mueve una cantidad mayor a 0.");
  const warehouse = await tx.warehouse.findUniqueOrThrow({
    where: { id: input.warehouseId },
    select: { kind: true, isActive: true },
  });
  if (!warehouse.isActive)
    throw new InventoryStateError("El almacén está dado de baja.");
  const products = await loadProducts(tx, inputLines);
  const serials = await lockSerialUnits(
    tx,
    inputLines.flatMap((l) => (l.serialUnitId ? [l.serialUnitId] : [])),
  );
  const valued = inputLines.map((line) => {
    const product = products.get(line.productId) as Product;
    assertSerialRule(product, line);
    const stock = lockedStock(locked, {
      warehouseId: input.warehouseId,
      productId: line.productId,
    });
    const entry = valueLine(stock, line, product);
    stock.quantity = entry.balance.quantity;
    stock.valueUsd = entry.balance.valueUsd;
    trackSerial(serials, line, input, warehouse.kind === "TRANSITO");
    return { line, entry, stock };
  });
  const movement = await tx.invMovement.create({
    data: header,
    select: { id: true, number: true },
  });
  const lines = await writeLines(tx, movement.id, valued);
  await saveCaches(tx, new Set(valued.map((v) => v.stock)), serials);
  return { movementId: movement.id, number: movement.number, lines };
}

function trackSerial(
  serials: Map<string, LockedSerial>,
  line: InvLineInput,
  input: InvMovementInput,
  isTransit: boolean,
): void {
  if (!line.serialUnitId) return;
  const unit = serials.get(line.serialUnitId) as LockedSerial;
  const moved = moveSerial(unit, {
    direction: line.direction,
    kind: input.kind,
    productId: line.productId,
    warehouseId: input.warehouseId,
    isTransit,
  });
  serials.set(unit.id, moved);
}

async function writeLines(
  tx: Tx,
  movementId: string,
  valued: readonly { line: InvLineInput; entry: ValuedEntry }[],
): Promise<PostedInvLine[]> {
  const lines: PostedInvLine[] = [];
  for (const { line, entry } of valued) {
    const created = await tx.invMovementLine.create({
      data: {
        movementId,
        productId: line.productId,
        quantity: entry.quantity.toFixed(2),
        valueUsd: entry.valueUsd.toFixed(2),
        balanceQuantity: entry.balance.quantity.toFixed(2),
        balanceValueUsd: entry.balance.valueUsd.toFixed(2),
        serialUnitId: line.serialUnitId,
        returnsLineId: line.returnsLineId,
        transferLineId: line.transferLineId,
      },
      select: { id: true },
    });
    lines.push({
      lineId: created.id,
      productId: line.productId,
      quantity: entry.quantity,
      valueUsd: entry.valueUsd,
    });
  }
  return lines;
}

async function saveCaches(
  tx: Tx,
  stocks: ReadonlySet<LockedStock>,
  serials: ReadonlyMap<string, LockedSerial>,
): Promise<void> {
  for (const stock of stocks)
    await tx.stock.update({
      where: { id: stock.stockId },
      data: {
        quantity: stock.quantity.toFixed(2),
        valueUsd: stock.valueUsd.toFixed(2),
      },
    });
  for (const unit of serials.values())
    await tx.serialUnit.update({
      where: { id: unit.id },
      data: { warehouseId: unit.warehouseId, status: unit.status },
    });
}

function valueLine(
  stock: LockedStock,
  line: InvLineInput,
  product: Product,
): ValuedEntry {
  if (line.direction === "IN") {
    if (!line.valueUsd) throw new RangeError("Una entrada necesita su valor.");
    return applyInbound(stock, line.quantity, line.valueUsd);
  }
  if (line.quantity.greaterThan(stock.quantity))
    throw new InsufficientStockError(product.code, stock.quantity.toString());
  return line.valueUsd
    ? applyOutboundAtValue(stock, line.quantity, line.valueUsd)
    : applyOutbound(stock, line.quantity);
}

// REGLA: un producto serializado se mueve de a una unidad con su serial; uno sin serial no lleva serial (§2.8).
function assertSerialRule(product: Product, line: InvLineInput): void {
  if (product.isSerialized && (!line.serialUnitId || !line.quantity.equals(1)))
    throw new InventoryStateError(
      `${product.code} es serializado: indica el serial de cada unidad.`,
    );
  if (!product.isSerialized && line.serialUnitId)
    throw new InventoryStateError(`${product.code} no lleva serial.`);
}

async function loadProducts(
  tx: Tx,
  lines: readonly InvLineInput[],
): Promise<Map<string, Product>> {
  const ids = [...new Set(lines.map((l) => l.productId))];
  const rows = await tx.product.findMany({
    where: { id: { in: ids } },
    select: { id: true, code: true, isSerialized: true },
  });
  if (rows.length !== ids.length)
    throw new InventoryStateError("Uno de los productos ya no existe.");
  return new Map(rows.map((row) => [row.id, row]));
}
