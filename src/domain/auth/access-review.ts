// src/domain/auth/access-review.ts
// Cuándo una cuenta activa está sin uso, para la revisión periódica de accesos (ISO 27001 A.5.18).

// REGLA: una cuenta activa sin iniciar sesión en 90 días se revisa (se da de baja si ya no hace falta).
export const DORMANT_AFTER_DAYS = 90;
const DAY_MS = 24 * 60 * 60_000;

// POR QUÉ: una cuenta creada hace poco que aún no entró no está «sin uso»; se cuenta desde su alta.
export function isDormantAccount(
  account: { isActive: boolean; createdAt: Date; lastSignInAt: Date | null },
  now: Date,
): boolean {
  if (!account.isActive) return false;
  const since = account.lastSignInAt ?? account.createdAt;
  return now.getTime() - since.getTime() > DORMANT_AFTER_DAYS * DAY_MS;
}
