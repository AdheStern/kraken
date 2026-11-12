// src/features/admin/schemas/cv-customer-schema.ts
// Cambio del cliente de un CV por el administrador del sistema (§2.3, decisión 2026-11-12); el motivo queda auditado.
import { z } from "zod";

export const changeCvCustomerSchema = z.object({
  cvId: z.uuid(),
  customerId: z.uuid("Elige el cliente nuevo."),
  reason: z
    .string()
    .trim()
    .min(5, "Escribe por qué cambias el cliente (al menos 5 caracteres).")
    .max(500, "El motivo admite hasta 500 caracteres."),
});

export type ChangeCvCustomerInput = z.input<typeof changeCvCustomerSchema>;
