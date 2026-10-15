// src/app/api/health/live/route.ts
// Vida del proceso (AGENTS.md §7): responde mientras Next atiende; no toca la base.
import { connection } from "next/server";

export async function GET() {
  // POR QUÉ: sin una API de petición, Cache Components prerenderiza la respuesta y dejaría de medir el proceso.
  await connection();
  return Response.json({ status: "ok" });
}
