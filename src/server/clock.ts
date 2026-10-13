// src/server/clock.ts
// Reloj real del sistema para inyectar en el dominio; en tests se reemplaza por uno fijo.
import type { Clock } from "@/domain/clock";

export const systemClock: Clock = {
  now: () => new Date(),
};
