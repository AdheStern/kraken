// src/features/admin/schemas/branch-schema.ts
// Sucursal de un cliente (decisión 2026-11-06): nombre, dirección, municipio, teléfono y coordenadas opcionales; el
// mismo zod valida el formulario y la action.
import { z } from "zod";

const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => value || null);

// POR QUÉ: las coordenadas llegan como texto del formulario y se guardan como NUMERIC(9,6), nunca como number.
const coordinate = (limit: number, label: string) =>
  z
    .string()
    .trim()
    .transform((value) => value.replace(",", "."))
    .refine(
      (value) =>
        value === "" ||
        (/^-?\d{1,3}(\.\d{1,6})?$/.test(value) &&
          Math.abs(Number(value)) <= limit),
      `Escribe la ${label} en grados, con hasta 6 decimales (por ejemplo -16.500000).`,
    )
    .transform((value) => value || null);

export const branchSchema = z
  .object({
    id: z.uuid().nullable(),
    customerId: z.uuid(),
    name: z
      .string()
      .trim()
      .min(2, "Escribe el nombre de la sucursal.")
      .max(120),
    address: text(200),
    municipalityId: z.uuid().nullable(),
    phone: text(40),
    latitude: coordinate(90, "latitud"),
    longitude: coordinate(180, "longitud"),
  })
  .refine((b) => (b.latitude === null) === (b.longitude === null), {
    message: "Escribe la latitud y la longitud juntas, o ninguna.",
  });

export type BranchInput = z.input<typeof branchSchema>;
