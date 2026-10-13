// src/components/brand/kraken-mark.tsx
// Isotipo de Kraken (cabeza de la mascota coral) para el riel de navegación y encabezados.

export function KrakenMark({ className }: { className?: string }) {
  return (
    <svg viewBox="-56 -62 112 112" className={className} aria-hidden="true">
      <path
        d="M-50 18C-50-32-26-58 0-58S50-32 50 18C50 36 32 44 0 44S-50 36-50 18Z"
        className="fill-(--coral)"
      />
      <ellipse cx="-18" cy="6" rx="9" ry="11" className="fill-(--brand-ink)" />
      <ellipse cx="18" cy="6" rx="9" ry="11" className="fill-(--brand-ink)" />
      <circle cx="-15" cy="1" r="3.4" className="fill-white" />
      <circle cx="21" cy="1" r="3.4" className="fill-white" />
      <path
        d="M-6 26q6 6 12 0"
        strokeWidth="3"
        strokeLinecap="round"
        className="fill-none stroke-(--brand-ink)"
      />
    </svg>
  );
}
