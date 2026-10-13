// src/features/sales-control/components/lines/pricing-badge.tsx
// Indicador FACTOR/PRECIO de una línea y aviso de factor aproximado (caso PRECIO-01, L2).
import type { LinePricing } from "@/domain/pricing/compute-line-pricing";

export function PricingBadge({
  source,
  pricing,
}: {
  source: "FACTOR" | "PRECIO";
  pricing: LinePricing | null;
}) {
  const isApproximate = pricing?.isFactorApproximate ?? false;
  const title = isApproximate
    ? `Precio ingresado; el factor ${pricing?.factor?.toFixed(2)} es aproximado.`
    : source === "FACTOR"
      ? "El precio sale del factor."
      : "Precio ingresado a mano.";

  return (
    <span
      role="img"
      title={title}
      aria-label={title}
      className={`flex h-5 min-w-5 shrink-0 items-center justify-center rounded px-1 text-[10px] font-semibold ${
        isApproximate
          ? "bg-warning/15 text-warning"
          : source === "FACTOR"
            ? "bg-primary/10 text-primary"
            : "bg-muted text-muted-foreground"
      }`}
    >
      {source === "FACTOR" ? "F" : isApproximate ? "P≈" : "P"}
    </span>
  );
}
