// src/features/inventory/queries/get-return-source.ts
// Salida a devolver, buscada por su número de comprobante (AGENTS.md §2.8 DEVOLUCION): por línea, lo despachado y
// lo que aún puede volver. Pasa por scopeInvMovementQuery y nunca lleva costos (regla 12).
import Decimal from "decimal.js";
import type { SessionUser } from "@/server/authz/roles";
import { scopeInvMovementQuery } from "@/server/authz/scope-inv-movement-query";
import { prisma } from "@/server/db";
import type { ReturnSource } from "../types";
import { destinationText } from "./get-receipt";

const dateTime = new Intl.DateTimeFormat("es-BO", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/La_Paz",
});

export async function getReturnSource(
  user: SessionUser,
  number: number,
): Promise<ReturnSource | null> {
  const movement = await prisma.invMovement.findFirst({
    where: { AND: [scopeInvMovementQuery(user), { number, kind: "SALIDA" }] },
    select: {
      id: true,
      number: true,
      createdAt: true,
      warehouse: { select: { name: true } },
      ticket: { select: { number: true, title: true } },
      cvLine: {
        select: {
          description: true,
          version: {
            select: {
              number: true,
              cv: {
                select: { code: true, customer: { select: { name: true } } },
              },
            },
          },
        },
      },
      lines: {
        orderBy: { id: "asc" },
        select: {
          id: true,
          quantity: true,
          serialUnit: { select: { serial: true } },
          product: { select: { code: true, description: true } },
          returns: { select: { quantity: true } },
        },
      },
    },
  });
  if (!movement) return null;
  return {
    movementId: movement.id,
    number: movement.number,
    issuedAt: dateTime.format(movement.createdAt),
    warehouse: movement.warehouse.name,
    destination: destinationText(movement),
    lines: movement.lines.map((line) => {
      // POR QUÉ: la salida se guarda con signo negativo y cada devolución con signo positivo (kardex).
      const shipped = new Decimal(line.quantity.toString()).abs();
      const returned = line.returns.reduce(
        (sum, r) => sum.plus(r.quantity.toString()),
        new Decimal(0),
      );
      return {
        lineId: line.id,
        code: line.product.code,
        description: line.product.description,
        serial: line.serialUnit?.serial ?? null,
        shipped: shipped.toString(),
        remaining: Decimal.max(shipped.minus(returned), 0).toString(),
      };
    }),
  };
}
