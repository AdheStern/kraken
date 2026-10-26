// src/features/inventory/queries/get-receipt.ts
// Datos del comprobante de una salida o devolución (AGENTS.md §2.8): destino legible, líneas agrupadas por producto
// con sus seriales y quién lo registró. Pasa por scopeInvMovementQuery; nunca lleva costos (regla 12).
import Decimal from "decimal.js";
import { toCvVersionLabel } from "@/domain/sales-control/cv-code";
import type { SessionUser } from "@/server/authz/roles";
import { scopeInvMovementQuery } from "@/server/authz/scope-inv-movement-query";
import { prisma } from "@/server/db";
import type { ReceiptData } from "@/server/inventory/receipt-pdf";

const dateTime = new Intl.DateTimeFormat("es-BO", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/La_Paz",
});

export async function getReceipt(
  user: SessionUser,
  movementId: string,
): Promise<ReceiptData | null> {
  const movement = await prisma.invMovement.findFirst({
    where: {
      AND: [
        scopeInvMovementQuery(user),
        { id: movementId, kind: { in: ["SALIDA", "DEVOLUCION"] } },
      ],
    },
    select: {
      kind: true,
      number: true,
      createdAt: true,
      documentRef: true,
      notes: true,
      warehouse: { select: { name: true } },
      actor: { select: { user: { select: { name: true } } } },
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
          quantity: true,
          serialUnit: { select: { serial: true } },
          product: { select: { id: true, code: true, description: true } },
        },
      },
    },
  });
  if (!movement) return null;
  return {
    title: movement.kind === "SALIDA" ? "Salida" : "Devolución",
    number: movement.number,
    issuedAt: dateTime.format(movement.createdAt),
    warehouse: movement.warehouse.name,
    destination: destinationText(movement),
    documentRef: movement.documentRef,
    notes: movement.notes,
    actor: movement.actor.user.name,
    lines: groupLines(movement.lines),
  };
}

export function destinationText(m: {
  ticket: { number: number; title: string } | null;
  cvLine: {
    description: string;
    version: {
      number: number;
      cv: { code: string; customer: { name: string } };
    };
  } | null;
}): string {
  if (m.cvLine) {
    const { cv, number } = m.cvLine.version;
    return `${toCvVersionLabel(cv.code, number)} · ${cv.customer.name} · «${m.cvLine.description}»`;
  }
  if (m.ticket) return `Ticket #${m.ticket.number} · ${m.ticket.title}`;
  return "Uso interno";
}

type Line = {
  quantity: { toString(): string };
  serialUnit: { serial: string } | null;
  product: { id: string; code: string; description: string };
};

function groupLines(lines: readonly Line[]): ReceiptData["lines"] {
  const groups = new Map<
    string,
    { code: string; description: string; quantity: Decimal; serials: string[] }
  >();
  for (const line of lines) {
    const group = groups.get(line.product.id) ?? {
      ...line.product,
      quantity: new Decimal(0),
      serials: [],
    };
    group.quantity = group.quantity.plus(
      new Decimal(line.quantity.toString()).abs(),
    );
    if (line.serialUnit) group.serials.push(line.serialUnit.serial);
    groups.set(line.product.id, group);
  }
  return [...groups.values()].map((g) => ({
    code: g.code,
    description: g.description,
    quantity: g.quantity.toString(),
    serials: g.serials,
  }));
}
