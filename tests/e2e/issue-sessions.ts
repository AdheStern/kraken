// tests/e2e/issue-sessions.ts
// Abre una sesión por rol demo en auth.session y escribe su cookie firmada como storageState de Playwright.
// Lo corre global-setup.ts con tsx (el cliente Prisma es ESM; el cargador de Playwright, no).
// POR QUÉ: en un build de producción solo la cuenta de emergencia entra con contraseña (ADR-05) y Better Auth
// limita los intentos por IP; la regla no se afloja para las pruebas: se emite la sesión como lo haría él.
import { createHmac, randomBytes, randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { E2E_USERS, storageFor } from "./users";

const SESSION_COOKIE = "better-auth.session_token";
const SESSION_MS = 2 * 60 * 60 * 1000;

async function main() {
  const hostname = process.argv[2] ?? "localhost";
  const secret = required("BETTER_AUTH_SECRET");
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: required("DATABASE_URL") }),
  });
  mkdirSync("tests/e2e/.auth", { recursive: true });
  try {
    for (const [role, email] of Object.entries(E2E_USERS)) {
      const user = await db.user.findUniqueOrThrow({ where: { email } });
      const token = randomBytes(24).toString("base64url");
      const expiresAt = new Date(Date.now() + SESSION_MS);
      await db.session.create({
        data: { id: randomUUID(), token, userId: user.id, expiresAt },
      });
      // TRAMPA: misma firma que Better Auth (HMAC-SHA256 en base64 tras el último punto).
      const signature = createHmac("sha256", secret)
        .update(token)
        .digest("base64");
      const cookie = {
        name: SESSION_COOKIE,
        value: encodeURIComponent(`${token}.${signature}`),
        domain: hostname,
        path: "/",
        expires: Math.floor(expiresAt.getTime() / 1000),
        httpOnly: true,
        secure: false,
        sameSite: "Lax",
      };
      writeFileSync(
        storageFor(role as keyof typeof E2E_USERS),
        JSON.stringify({ cookies: [cookie], origins: [] }),
      );
    }
  } finally {
    await db.$disconnect();
  }
}

function required(name: string): string {
  const value = process.env[name];
  if (!value)
    throw new Error(
      `Define ${name} para las pruebas E2E (la misma del servidor).`,
    );
  return value;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
