// src/domain/sales-control/renewal-warnings.ts
// Qué aviso de renovación corresponde a una línea según los días que le quedan de vigencia y los umbrales
// configurados (job renewals.notify, AGENTS.md §2.1 "Vigencia" y §7).

export type RenewalWarning = { days: number; markDays: number[] };

// REGLA: se avisa el umbral más cercano que ya se cruzó y se dan por avisados los mayores, para que una línea
// cargada a 10 días de vencer reciba un solo aviso y no el de 60 y el de 15 a la vez.
export function dueRenewalWarning(
  daysLeft: number,
  thresholds: readonly number[],
  alreadySent: readonly number[],
): RenewalWarning | null {
  if (daysLeft < 0) return null;
  const crossed = thresholds.filter(
    (days) => daysLeft <= days && !alreadySent.includes(days),
  );
  if (crossed.length === 0) return null;
  return { days: Math.min(...crossed), markDays: crossed };
}
