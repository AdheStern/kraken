// src/app/api/health/ready/route.ts
// Disponibilidad del nodo para HAProxy (AGENTS.md §7, §10): 200 si la base y la carpeta de adjuntos (si se usa FILES_ROOT) responden, 503 si no.
import { prisma } from "@/server/db";
import { checkReadiness } from "@/server/health/check-readiness";
import { log } from "@/server/log";

export async function GET() {
  const result = await checkReadiness(prisma, process.env.FILES_ROOT);
  if (!result.ready) log("warn", "nodo no disponible", result.checks);
  return Response.json(result, { status: result.ready ? 200 : 503 });
}
