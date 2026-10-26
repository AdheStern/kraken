// src/features/documentation/schemas/doc-project-schema.ts
// Cabecera de un proyecto de documentación (AGENTS.md §2.10): nombre, cliente, contacto, tecnologías y
// encargado. El mismo zod valida el formulario de alta, el de edición y sus actions.
import { z } from "zod";

const text = (max: number) =>
  z.string().trim().max(max, `Máximo ${max} caracteres.`);

export const docProjectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Escribe un nombre de al menos 3 caracteres.")
    .max(160, "Máximo 160 caracteres."),
  customerId: z.uuid("Elige el cliente."),
  contactId: z.uuid().nullable(),
  contactName: text(120),
  contactEmail: z.union([z.email("Escribe un correo válido."), z.literal("")]),
  contactPhone: text(40),
  technologyIds: z.array(z.uuid()).max(20),
  ownerId: z.string().min(1, "Elige al encargado."),
});

export type DocProjectInput = z.infer<typeof docProjectSchema>;

export const updateDocProjectSchema = docProjectSchema.extend({
  projectId: z.uuid(),
});

export type UpdateDocProjectInput = z.infer<typeof updateDocProjectSchema>;
