// src/features/admin/schemas/customer-account-schemas.ts
// Cuenta de una empresa cliente en el portal (AGENTS.md §2.11): alta con contraseña y edición de su
// configuración. La contraseña la fija el administrador (12+ caracteres).
import { z } from "zod";

const password = z
  .string()
  .min(12, "La contraseña necesita al menos 12 caracteres.")
  .max(128, "Máximo 128 caracteres.");

const portal = {
  seesBags: z.boolean(),
  requestsWork: z.boolean(),
  comments: z.boolean(),
};

export const createCustomerAccountSchema = z.object({
  customerId: z.uuid("Elige el cliente."),
  name: z.string().trim().min(2, "Escribe el nombre de la cuenta.").max(120),
  email: z.email("Escribe un correo válido.").trim().toLowerCase(),
  password,
  ...portal,
});

export type CreateCustomerAccountInput = z.input<
  typeof createCustomerAccountSchema
>;

export const updateCustomerAccountSchema = z.object({
  userId: z.string().min(1),
  // POR QUÉ: vacío = no cambiar la contraseña.
  password: z.union([z.literal(""), password]),
  ...portal,
});

export type UpdateCustomerAccountInput = z.input<
  typeof updateCustomerAccountSchema
>;
