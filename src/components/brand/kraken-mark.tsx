// src/components/brand/kraken-mark.tsx
// Isotipo de Kraken (cabeza de la mascota coral) para el riel. Parpadea y, con algo pendiente, mira hacia la
// navegación y flota (DESIGN.md, Kraken signature; con reduced motion queda quieto y solo cambia la mirada).
import { cn } from "@/lib/utils";

type Props = { className?: string; mood?: "idle" | "alert" };

export function KrakenMark({ className, mood = "idle" }: Props) {
  const isAlert = mood === "alert";
  return (
    <svg
      viewBox="-56 -62 112 112"
      className={cn(isAlert && "kr-bob", className)}
      aria-hidden="true"
    >
      <path
        d="M-50 18C-50-32-26-58 0-58S50-32 50 18C50 36 32 44 0 44S-50 36-50 18Z"
        className="fill-(--coral)"
      />
      <ellipse
        cx="-34"
        cy="22"
        rx="7"
        ry="4.5"
        className="fill-(--blush) opacity-70"
      />
      <ellipse
        cx="34"
        cy="22"
        rx="7"
        ry="4.5"
        className="fill-(--blush) opacity-70"
      />
      <g className="kr-blink">
        <ellipse
          cx="-18"
          cy="6"
          rx="9"
          ry="11"
          className="fill-(--brand-ink)"
        />
        <ellipse cx="18" cy="6" rx="9" ry="11" className="fill-(--brand-ink)" />
        {/* POR QUÉ: con pendientes, las pupilas bajan hacia la navegación, donde espera la bandeja. */}
        <g
          className="transition-transform duration-500 ease-out motion-reduce:transition-none"
          style={isAlert ? { transform: "translate(2px, 5px)" } : undefined}
        >
          <circle cx="-15" cy="1" r="3.4" className="fill-white" />
          <circle cx="21" cy="1" r="3.4" className="fill-white" />
        </g>
      </g>
      <path
        d={isAlert ? "M-5 27q5 3 10 0" : "M-6 26q6 6 12 0"}
        strokeWidth="3"
        strokeLinecap="round"
        className="fill-none stroke-(--brand-ink)"
      />
    </svg>
  );
}
