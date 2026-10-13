// src/lib/auth-client.ts
// Cliente de Better Auth para el navegador; usa el mismo origen que la app (/api/auth/*).
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient();
