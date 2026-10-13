// src/features/auth/schemas/admin-sign-in-schema.ts
// Validación del formulario de acceso del administrador del sistema (correo y contraseña).
import { z } from "zod";

// POR QUÉ: los mismos límites que Better Auth (8 a 128) para que el error se vea antes del envío.
export const adminSignInSchema = z.object({
  email: z.email("Escribe un correo válido, por ejemplo admin@dima.com.bo."),
  password: z
    .string()
    .min(8, "La contraseña tiene al menos 8 caracteres.")
    .max(128, "La contraseña no puede superar 128 caracteres."),
});

export type AdminSignInInput = z.infer<typeof adminSignInSchema>;
