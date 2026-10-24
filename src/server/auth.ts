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
import { trustedProxiesFromEnv } from "@/server/client-ip";
import { prisma } from "@/server/db";
import { syncEntraRolesFromAccount } from "@/server/entra/sync-entra-roles";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  // REGLA: los roles de Entra se recalculan al iniciar sesión; una sesión de una jornada, sin extenderse sola,
  // hace que sacar a alguien de un grupo o desactivarlo en Entra rija el mismo día (ADR-05).
  session: {
    expiresIn: 60 * 60 * 12,
    disableSessionRefresh: true,
  },
  emailAndPassword: {
    enabled: true,
    // REGLA: nadie se registra solo; la cuenta de emergencia se crea con `pnpm db:seed:admin`.
    disableSignUp: true,
    // REGLA: el mismo mínimo que exige el seed de la cuenta de emergencia (AGENTS.md §10).
    minPasswordLength: 12,
  },
  // POR QUÉ: con dos nodos detrás de HAProxy el conteo en memoria se partía; en la base lo comparten.
  rateLimit: { storage: "database" },
  advanced: {
    // TRAMPA: detrás de FortiGate y HAProxy, X-Forwarded-For trae varios saltos; sin proxies de confianza Better
    // Auth no resuelve la IP y todos comparten un solo cupo de intentos de login.
    ipAddress: { trustedProxies: trustedProxiesFromEnv() },
  },
  // POR QUÉ: los tokens de acceso de Microsoft no se usan después del login; si quedan guardados, van cifrados.
  account: { encryptOAuthTokens: true },
  socialProviders: {
    microsoft: {
      clientId: process.env.ENTRA_CLIENT_ID ?? "",
      clientSecret: process.env.ENTRA_CLIENT_SECRET,
      // REGLA: inquilino único de DIMA; nunca "common" (AGENTS.md ADR-05).
      tenantId: process.env.ENTRA_TENANT_ID,
      prompt: "select_account",
      // POR QUÉ: sin offline_access no se emiten refresh tokens que nadie usa (ADR-05).
      disableDefaultScope: true,
      scope: ["openid", "profile", "email", "User.Read"],
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
    // REGLA: los roles de origen ENTRA se recalculan en cada inicio de sesión con Microsoft, antes de crear la
    // sesión (ADR-05). Si falla, falla el inicio de sesión: nunca se entra con roles viejos.
    account: {
      create: { after: syncEntraRolesFromAccount },
      update: { after: syncEntraRolesFromAccount },
    },
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
