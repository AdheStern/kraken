// src/server/sales-control/allocate-cv-number.ts
// Asigna el siguiente correlativo de CV por ciudad y año dentro de la transacción que crea el CV.
import type { Tx } from "@/server/db";

// REGLA: correlativo con bloqueo de fila sobre cv.numerador, nunca MAX()+1, nunca reutilizado (AGENTS.md §2.1).
// POR QUÉ: el upsert bloquea la fila igual que SELECT … FOR UPDATE hasta el fin de la transacción y además
// crea la fila del primer CV del año sin carrera entre dos transacciones.
export async function allocateCvNumber(
  tx: Tx,
  cityId: string,
  year: number,
): Promise<number> {
  const rows = await tx.$queryRaw<{ ultimo_numero: number }[]>`
    INSERT INTO cv.numerador (ciudad_id, anio, ultimo_numero)
    VALUES (${cityId}::uuid, ${year}, 1)
    ON CONFLICT (ciudad_id, anio)
    DO UPDATE SET ultimo_numero = cv.numerador.ultimo_numero + 1
    RETURNING ultimo_numero`;
  const allocated = rows[0]?.ultimo_numero;
  if (allocated === undefined) {
    throw new Error("cv.numerador no devolvió un correlativo");
  }
  return allocated;
}
