// src/server/auth.ts
// Configuración de Better Auth: Entra ID para el personal y email/contraseña solo para la cuenta
// de emergencia del administrador del sistema (AGENTS.md ADR-05).
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import {
  canSignInWithPassword,
  ensureUserProfile,
  isAccountDisabled,
} from "@/server/auth-policies";
import { prisma } from "@/server/db";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    // REGLA: nadie se registra solo; la cuenta de emergencia se crea con `pnpm db:seed:admin`.
    disableSignUp: true,
  },
  socialProviders: {
    microsoft: {
      clientId: process.env.ENTRA_CLIENT_ID ?? "",
      clientSecret: process.env.ENTRA_CLIENT_SECRET,
      // REGLA: inquilino único de DIMA; nunca "common" (AGENTS.md ADR-05).
      tenantId: process.env.ENTRA_TENANT_ID,
      prompt: "select_account",
      // POR QUÉ: el avatar mide 32 px; 96 px se ve nítido en pantallas de alta densidad (Graph /me/photos).
      profilePhotoSize: 96,
      // POR QUÉ: nombre y foto siguen a Microsoft 365; sin esto solo se guardan al crear el usuario.
      overrideUserInfoOnSignIn: true,
    },
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-in/email") return;
      const email: unknown = ctx.body?.email;
      // TRAMPA: mismo error que una contraseña incorrecta para no revelar qué correos existen.
      if (typeof email !== "string" || !(await canSignInWithPassword(email))) {
        throw APIError.from("UNAUTHORIZED", {
          code: "INVALID_EMAIL_OR_PASSWORD",
          message: "Invalid email or password",
        });
      }
    }),
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await ensureUserProfile(user.id);
        },
      },
    },
    session: {
      create: {
        before: async (session) => {
          if (await isAccountDisabled(session.userId)) {
            throw APIError.from("FORBIDDEN", {
              code: "ACCOUNT_DISABLED",
              message: "Account disabled",
            });
          }
        },
      },
    },
  },
  // TRAMPA: nextCookies debe ser el último plugin para que las cookies lleguen desde Server Actions.
  plugins: [nextCookies()],
});
