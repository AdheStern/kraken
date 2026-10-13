// src/features/sales-control/schemas/cv-header-schema.ts
// Cabecera editable de una versión en BORRADOR (AGENTS.md §2.1): personas, clasificación, cliente
// final, orden del cliente, notas y tipos de cambio.
import { z } from "zod";
import { fxRateField, optionalDate, optionalId, optionalText } from "./fields";

export const cvHeaderSchema = z.object({
  versionId: z.uuid(),
  title: z
    .string()
    .trim()
    .min(3, "Escribe un título de al menos 3 caracteres.")
    .max(160, "Máximo 160 caracteres."),
  issuedOn: z.iso.date("Elige la fecha del CV."),
  sellerIds: z.array(z.string().min(1)).min(1, "Elige al menos un vendedor."),
  presalesId: optionalId,
  postsalesId: optionalId,
  mainTechnologyId: optionalId,
  serviceTypeId: optionalId,
  isNewTechnology: z.boolean(),
  contactName: optionalText(120),
  contactEmail: z.union([z.email("Escribe un correo válido."), z.literal("")]),
  contactPhone: optionalText(40),
  endCustomerId: optionalId,
  customerPoNumber: optionalText(60),
  customerPoDate: optionalDate,
  paymentTerms: optionalText(160),
  deliveryOn: optionalDate,
  notes: optionalText(2000),
  costFxRate: fxRateField,
  saleFxRate: fxRateField,
});

export type CvHeaderInput = z.infer<typeof cvHeaderSchema>;
