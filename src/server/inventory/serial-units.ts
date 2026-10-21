// src/server/inventory/serial-units.ts
// Seriales de inventario: alta o reutilización de (producto, serial) al ingresar, bloqueo y paso de estado según
// el movimiento (AGENTS.md §2.8).

import { Prisma } from "@/generated/prisma/client";
import type { InvMovementKind, SerialStatus } from "@/generated/prisma/enums";
import type { Tx } from "@/server/db";
import { InventoryStateError } from "./inventory-errors";

export type LockedSerial = {
  id: string;
  productId: string;
  serial: string;
  warehouseId: string | null;
  status: SerialStatus;
};

type Row = {
  id: string;
  producto_id: string;
  serial: string;
  almacen_id: string | null;
  estado: SerialStatus;
};

// POR QUÉ: un serial que vuelve (devolución o recompra) reutiliza su fila; crearla de nuevo violaría el único
// (producto, serial). Se valida su estado más tarde, con el stock ya bloqueado.
export async function resolveInboundSerials(
  tx: Tx,
  productId: string,
  serials: readonly string[],
): Promise<Map<string, string>> {
  const wanted = [...new Set(serials.map((s) => s.trim()).filter(Boolean))];
  if (wanted.length === 0) return new Map();
  await tx.serialUnit.createMany({
    data: wanted.map((serial) => ({ productId, serial })),
    skipDuplicates: true,
  });
  const rows = await tx.serialUnit.findMany({
    where: { productId, serial: { in: wanted } },
    select: { id: true, serial: true },
  });
  return new Map(rows.map((row) => [row.serial, row.id]));
}

export async function lockSerialUnits(
  tx: Tx,
  ids: readonly string[],
): Promise<Map<string, LockedSerial>> {
  const unique = [...new Set(ids)].sort();
  if (unique.length === 0) return new Map();
  const rows = await tx.$queryRaw<Row[]>`
    SELECT id::text AS id, producto_id::text AS producto_id, serial, almacen_id::text AS almacen_id,
           estado::text AS estado
    FROM inv.unidad_serial
    WHERE id IN (${Prisma.join(unique.map((id) => Prisma.sql`${id}::uuid`))})
    ORDER BY id
    FOR UPDATE`;
  return new Map(
    rows.map((row) => [
      row.id,
      {
        id: row.id,
        productId: row.producto_id,
        serial: row.serial,
        warehouseId: row.almacen_id,
        status: row.estado,
      },
    ]),
  );
}

// REGLA: un serial entra solo si hoy no está en ningún almacén, y sale solo del almacén donde está. Al salir queda
// DESPACHADO (salida), BAJA (ajuste) o sin almacén hasta su entrada en la misma transacción (traspaso).
export function moveSerial(
  unit: LockedSerial,
  move: {
    direction: "IN" | "OUT";
    kind: InvMovementKind;
    productId: string;
    warehouseId: string;
    isTransit: boolean;
  },
): LockedSerial {
  if (unit.productId !== move.productId)
    throw new InventoryStateError(
      `El serial ${unit.serial} es de otro producto.`,
    );
  if (move.direction === "IN") {
    if (unit.warehouseId !== null)
      throw new InventoryStateError(
        `El serial ${unit.serial} ya está en un almacén.`,
      );
    return {
      ...unit,
      warehouseId: move.warehouseId,
      status: move.isTransit ? "EN_TRANSITO" : "EN_STOCK",
    };
  }
  if (unit.warehouseId !== move.warehouseId)
    throw new InventoryStateError(
      `El serial ${unit.serial} no está en este almacén.`,
    );
  const status: SerialStatus =
    move.kind === "SALIDA"
      ? "DESPACHADO"
      : move.kind === "AJUSTE"
        ? "BAJA"
        : unit.status;
  return { ...unit, warehouseId: null, status };
}
