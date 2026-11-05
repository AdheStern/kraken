// src/features/inventory/queries/get-serial-trace.ts
// Recorrido de un serial: sus unidades en inventario con los movimientos que las movieron (ingreso, traspasos,
// salidas, devoluciones) y las líneas de CV que lo nombran con su vigencia (AGENTS.md §2.8, decisión 2026-11-05).
// REGLA: cada parte con su alcance (regla 7): los movimientos con scopeInvMovementQuery o, si fueron a un ticket,
// con scopeTicketQuery (quien ve el ticket ve sus materiales); los CV con scopeSalesLineQuery. Sin costos.
import { toCvVersionLabel } from "@/domain/sales-control/cv-code";
import { canSeeInventoryCosts } from "@/server/authz/inventory-permissions";
import type { SessionUser } from "@/server/authz/roles";
import { scopeInvMovementQuery } from "@/server/authz/scope-inv-movement-query";
import { scopeSalesLineQuery } from "@/server/authz/scope-sales-line-query";
import { scopeTicketQuery } from "@/server/authz/scope-ticket-query";
import { prisma } from "@/server/db";
import type { SerialTrace } from "../serial-trace-types";
import { toKardexDocument } from "./to-kardex-document";

const DOCUMENT_SELECT = {
  documentRef: true,
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
} as const;

export async function getSerialTrace(
  user: SessionUser,
  serial: string,
): Promise<SerialTrace> {
  const match = { equals: serial.trim(), mode: "insensitive" as const };
  // TRAMPA: Prisma no trata `{}` dentro de un OR como «todo»; el alcance amplio va solo.
  const visibleMovement = canSeeInventoryCosts(user)
    ? scopeInvMovementQuery(user)
    : { ticket: scopeTicketQuery(user) };
  const units = await prisma.serialUnit.findMany({
    where: { serial: match },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      serial: true,
      status: true,
      product: { select: { code: true, description: true } },
      warehouse: { select: { name: true } },
      movementLines: {
        where: { movement: visibleMovement },
        orderBy: { movement: { createdAt: "asc" } },
        select: {
          quantity: true,
          movement: {
            select: {
              id: true,
              kind: true,
              number: true,
              createdAt: true,
              warehouse: { select: { name: true } },
              ...DOCUMENT_SELECT,
            },
          },
        },
      },
    },
  });
  const mentions = await prisma.cvLineSerial.findMany({
    where: { serial: match, line: scopeSalesLineQuery(user) },
    select: {
      line: {
        select: {
          description: true,
          coverageStart: true,
          coverageEnd: true,
          version: {
            select: {
              number: true,
              status: true,
              cv: {
                select: {
                  id: true,
                  code: true,
                  customer: { select: { name: true } },
                },
              },
            },
          },
        },
      },
    },
  });
  return {
    serial: serial.trim(),
    units: units.map((unit) => ({
      id: unit.id,
      serial: unit.serial,
      code: unit.product.code,
      description: unit.product.description,
      status: unit.status,
      warehouse: unit.warehouse?.name ?? null,
      events: unit.movementLines.map(({ quantity, movement }) => ({
        id: movement.id,
        kind: movement.kind,
        number: movement.number,
        createdAt: movement.createdAt.toISOString(),
        warehouse: movement.warehouse.name,
        isIn: quantity.greaterThan(0),
        document: toKardexDocument(movement),
      })),
    })),
    sales: mentions.map(({ line }) => ({
      cvId: line.version.cv.id,
      cvLabel: toCvVersionLabel(line.version.cv.code, line.version.number),
      versionStatus: line.version.status,
      customerName: line.version.cv.customer.name,
      description: line.description,
      coverageStart: toDay(line.coverageStart),
      coverageEnd: toDay(line.coverageEnd),
    })),
  };
}

function toDay(date: Date | null): string | null {
  return date ? date.toISOString().slice(0, 10) : null;
}
