// src/features/sales-control/schemas/create-cv-schema.ts
// Datos mínimos para crear un CV: ciudad (define el correlativo), cliente, título y tipos de cambio.
import { z } from "zod";
import { fxRateField } from "./fields";

export const createCvSchema = z.object({
  cityId: z.uuid("Elige la ciudad del CV."),
  customerId: z.uuid("Elige el cliente."),
  title: z
    .string()
    .trim()
    .min(3, "Escribe un título de al menos 3 caracteres.")
    .max(160, "Máximo 160 caracteres."),
  costFxRate: fxRateField,
  saleFxRate: fxRateField,
});

export type CreateCvInput = z.infer<typeof createCvSchema>;
