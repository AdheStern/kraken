// src/app/api/health/ready/route.ts
// Disponibilidad del nodo para HAProxy (AGENTS.md §7, §10): 200 si la base y la carpeta de adjuntos (si se usa FILES_ROOT) responden, 503 si no.
import { prisma } from "@/server/db";
import { checkReadiness } from "@/server/health/check-readiness";
import { log } from "@/server/log";

export async function GET() {
  const result = await checkReadiness(prisma, process.env.FILES_ROOT);
  if (!result.ready) log("warn", "nodo no disponible", result.checks);
  // POR QUÉ: la ruta es pública para HAProxy; el detalle del error (host de la base, carpetas) queda en el log.
  const checks = Object.fromEntries(
    Object.entries(result.checks).map(([name, state]) => [
      name,
      state === "ok" ? "ok" : "falla",
    ]),
  );
  return Response.json(
    { ready: result.ready, checks },
    { status: result.ready ? 200 : 503 },
  );
}
