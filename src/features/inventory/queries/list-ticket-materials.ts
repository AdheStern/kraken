// src/features/inventory/queries/list-ticket-materials.ts
// Materiales despachados a un ticket: neto por producto con sus seriales y los comprobantes que lo explican
// (AGENTS.md §2.8). Solo cantidades: nunca costos (regla 12).
// POR QUÉ: el alcance es el del ticket (scopeTicketQuery), no el de inventario: quien atiende el ticket necesita
// saber qué se le entregó aunque no vea el kardex.
import Decimal from "decimal.js";
import { netTicketMaterials } from "@/domain/inventory/net-ticket-materials";
import { canSeeInventoryCosts } from "@/server/authz/inventory-permissions";
import type { SessionUser } from "@/server/authz/roles";
import { scopeTicketQuery } from "@/server/authz/scope-ticket-query";
import { prisma } from "@/server/db";

export type TicketMaterialItem = {
  code: string;
  description: string;
  quantity: string;
  serials: string[];
};

export type TicketMaterialDocument = {
  id: string;
  kind: "SALIDA" | "DEVOLUCION";
  number: number;
  createdAt: string;
  warehouse: string;
  actor: string;
};

export type TicketMaterials = {
  items: TicketMaterialItem[];
  documents: TicketMaterialDocument[];
  // POR QUÉ: la ruta del comprobante pasa por scopeInvMovementQuery; sin ese alcance el enlace daría 404.
  canDownloadReceipts: boolean;
};

export async function listTicketMaterials(
  user: SessionUser,
  ticketId: string,
): Promise<TicketMaterials | null> {
  const ticket = await prisma.ticket.findFirst({
    where: { AND: [scopeTicketQuery(user), { id: ticketId }] },
    select: { id: true },
  });
  if (!ticket) return null;
  const movements = await prisma.invMovement.findMany({
    where: { ticketId, kind: { in: ["SALIDA", "DEVOLUCION"] } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      kind: true,
      number: true,
      createdAt: true,
      warehouse: { select: { name: true } },
      actor: { select: { user: { select: { name: true } } } },
      lines: {
        select: {
          productId: true,
          quantity: true,
          serialUnit: { select: { serial: true } },
          product: { select: { code: true, description: true } },
        },
      },
    },
  });
  const lines = movements.flatMap((m) =>
    m.lines.map((l) => ({
      productId: l.productId,
      code: l.product.code,
      description: l.product.description,
      quantity: new Decimal(l.quantity.toString()),
      serial: l.serialUnit?.serial ?? null,
    })),
  );
  return {
    items: netTicketMaterials(lines).map((m) => ({
      code: m.code,
      description: m.description,
      quantity: m.quantity.toString(),
      serials: m.serials,
    })),
    documents: movements.map((m) => ({
      id: m.id,
      kind: m.kind === "SALIDA" ? "SALIDA" : "DEVOLUCION",
      number: m.number,
      createdAt: m.createdAt.toISOString(),
      warehouse: m.warehouse.name,
      actor: m.actor.user.name,
    })),
    canDownloadReceipts: canSeeInventoryCosts(user),
  };
}
