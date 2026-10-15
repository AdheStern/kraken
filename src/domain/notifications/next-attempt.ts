// src/domain/notifications/next-attempt.ts
// Reintentos del envío de correo (AGENTS.md §7 mail.dispatch): espera exponencial con tope, y abandono tras
// 10 fallos para avisar al administrador.

export const MAX_ATTEMPTS = 10;
const BASE_MINUTES = 1;
const CAP_MINUTES = 6 * 60;

// REGLA: 1, 2, 4, 8… minutos, nunca más de 6 h entre intentos.
export function computeNextAttempt(now: Date, attempts: number): Date {
  const minutes = Math.min(
    BASE_MINUTES * 2 ** Math.max(0, attempts - 1),
    CAP_MINUTES,
  );
  return new Date(now.getTime() + minutes * 60_000);
}

export function shouldGiveUp(attempts: number): boolean {
  return attempts >= MAX_ATTEMPTS;
}
