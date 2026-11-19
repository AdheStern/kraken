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
  acronym: text(20).optional(),
  email,
  phone: text(40),
  address: text(200),
  country: text(80),
  tenant: text(120).optional(),
  notes: text(4000).optional(),
  industryId: z.uuid().nullable(),
  // Grupo empresarial (decisión 2026-11-16); opcional.
  groupId: z.uuid().nullable().optional(),
  companyType: z
    .enum([
      "PUBLICA",
      "PRIVADA",
      "MIXTA",
      "ONG",
      "ORGANISMO_INTERNACIONAL",
      "OTRA",
    ])
    .nullable(),
  municipalityId: z.uuid().nullable(),
});

export type CustomerInput = z.input<typeof customerSchema>;

export const customerContactSchema = z.object({
  id: z.uuid().nullable(),
  customerId: z.uuid(),
  // Persona ya registrada a la que se le agrega este puesto (aviso de duplicados); sin ella se crea una nueva.
  personId: z.uuid().nullable().optional(),
  name: z.string().trim().min(2, "Escribe el nombre del contacto.").max(120),
  position: text(80),
  email,
  phone: text(40),
  municipalityId: z.uuid().nullable().optional(),
  branchId: z.uuid().nullable().optional(),
  areaIds: z.array(z.uuid()).max(20).optional(),
  userIds: z.array(z.string().min(1)).max(20).optional(),
  // Al editar: otros puestos activos de la misma persona que reciben su correo y teléfono (decisión 2026-11-16).
  syncContactIds: z.array(z.uuid()).max(30).optional(),
});

export type CustomerContactInput = z.input<typeof customerContactSchema>;
