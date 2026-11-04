// src/domain/security/security-alert-rules.ts
// Cuándo avisar de intentos fallidos de inicio de sesión (ISO 27001 A.8.16, job security.watch). Puro: recibe el
// instante de la corrida y los intentos ya leídos.

// REGLA: 5 contraseñas fallidas sobre una misma cuenta en 15 min avisan al administrador del sistema.
export const FAILED_SIGN_IN_THRESHOLD = 5;
export const FAILED_SIGN_IN_WINDOW_MS = 15 * 60_000;
// POR QUÉ: el job corre cada 5 min y mira el tramo cerrado; alinear el tramo al reloj hace que dos corridas nunca
// vean el mismo y que no haga falta guardar qué se avisó.
export const ALERT_SLICE_MS = 5 * 60_000;

export type Slice = { from: Date; to: Date };
export type FailedAttempt = { email: string; at: Date };

export function lastClosedSlice(now: Date): Slice {
  const to = Math.floor(now.getTime() / ALERT_SLICE_MS) * ALERT_SLICE_MS;
  return { from: new Date(to - ALERT_SLICE_MS), to: new Date(to) };
}

// Desde dónde hay que leer intentos para evaluar el tramo (la ventana que termina al inicio del tramo).
export function attemptsReadFrom(slice: Slice): Date {
  return new Date(slice.from.getTime() - FAILED_SIGN_IN_WINDOW_MS);
}

// REGLA: se avisa una vez, en el tramo en que la cuenta cruza el umbral; si sigue intentándose, vuelve a avisar
// cuando la ventana se vacía y lo cruza de nuevo.
export function accountsCrossingThreshold(
  attempts: readonly FailedAttempt[],
  slice: Slice,
): string[] {
  const crossing: string[] = [];
  for (const [email, times] of groupByEmail(attempts)) {
    const atEnd = countInWindow(times, slice.to.getTime());
    const atStart = countInWindow(times, slice.from.getTime());
    if (atEnd >= FAILED_SIGN_IN_THRESHOLD && atStart < FAILED_SIGN_IN_THRESHOLD)
      crossing.push(email);
  }
  return crossing.sort();
}

function groupByEmail(attempts: readonly FailedAttempt[]) {
  const byEmail = new Map<string, number[]>();
  for (const { email, at } of attempts)
    byEmail.set(email, [...(byEmail.get(email) ?? []), at.getTime()]);
  return byEmail;
}

function countInWindow(times: readonly number[], end: number): number {
  const start = end - FAILED_SIGN_IN_WINDOW_MS;
  return times.filter((t) => t >= start && t < end).length;
}
