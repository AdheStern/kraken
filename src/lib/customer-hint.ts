// src/lib/customer-hint.ts
// Ayuda de un cliente en los selectores y la búsqueda: sigla y NIT, para encontrarlo también por ellos.

export function customerHint(customer: {
  acronym?: string | null;
  taxId: string | null;
}): string | undefined {
  const parts = [customer.acronym, customer.taxId].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : undefined;
}
