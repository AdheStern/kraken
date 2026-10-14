// src/features/admin/schemas/customer-schemas.ts
// Entradas del catálogo de clientes y sus contactos; el mismo zod valida el formulario y la action.
// Los datos del cliente se copian en cada versión de CV al guardarla (snapshot, AGENTS.md §2.1).
import { z } from "zod";

const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => value || null);

const email = z
  .string()
  .trim()
  .transform((value) => value || null)
  .pipe(z.email("Escribe un correo válido.").nullable());

export const customerSchema = z.object({
  id: z.uuid().nullable(),
  name: z.string().trim().min(2, "Escribe la razón social.").max(160),
  taxId: text(30),
  email,
  phone: text(40),
  address: text(200),
  city: text(80),
  country: text(80),
});

export type CustomerInput = z.input<typeof customerSchema>;

export const customerContactSchema = z.object({
  id: z.uuid().nullable(),
  customerId: z.uuid(),
  name: z.string().trim().min(2, "Escribe el nombre del contacto.").max(120),
  position: text(80),
  email,
  phone: text(40),
});

export type CustomerContactInput = z.input<typeof customerContactSchema>;
