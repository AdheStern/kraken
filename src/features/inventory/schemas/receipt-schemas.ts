// src/features/inventory/schemas/receipt-schemas.ts
// Ingreso a un almacén (AGENTS.md §2.8): origen, PO#, notas y filas tal como se escriben o se pegan; las filas se
// validan con parseReceiptRows, la misma función que usa la grilla.
import { z } from "zod";

const draftRow = z.object({
  code: z.string().max(60),
  description: z.string().max(300),
  quantity: z.string().max(20),
  unitCostUsd: z.string().max(20),
  serials: z.string().max(5000),
});

export const receiptSchema = z.object({
  warehouseId: z.uuid("Elige el almacén."),
  origin: z.enum(["COMPRA_LOCAL", "IMPORTACION", "INVENTARIO_INICIAL"]),
  documentRef: z
    .string()
    .trim()
    .max(60, "El PO# es muy largo; usa hasta 60 caracteres.")
    .transform((v) => v || null),
  notes: z
    .string()
    .trim()
    .max(300, "Las notas son muy largas; usa hasta 300 caracteres.")
    .transform((v) => v || null),
  // POR QUÉ: la genera la pantalla al abrirse; reenviar el mismo ingreso no lo registra dos veces.
  idempotencyKey: z.uuid(),
  rows: z.array(draftRow).max(500, "Registra hasta 500 filas por ingreso."),
});

export type ReceiptFormInput = z.input<typeof receiptSchema>;
