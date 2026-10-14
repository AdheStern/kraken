// src/features/sales-control/components/opening-balance-badge.tsx
// Insignia de un CV de saldo inicial: no es una venta del periodo (AGENTS.md §14, F2; se excluye de los KPI, §6).
import { Badge } from "@/components/ui/badge";

export function OpeningBalanceBadge() {
  return (
    <Badge variant="secondary" className="bg-primary/10 text-primary">
      Saldo inicial
    </Badge>
  );
}
