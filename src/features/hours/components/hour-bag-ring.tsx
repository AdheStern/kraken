// src/features/hours/components/hour-bag-ring.tsx
// Anillo de consumo de una bolsa: el nodo hueco del isotipo DIMA (DESIGN.md) con el arco consumido.
// Trazo de 5 px en tarjetas (nodo de módulo) y 3.5 px en filas (satélite); el % siempre va también en texto.
import type { BagStatus } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";
import type { BagSummary } from "../types";

const SIZES = {
  sm: { box: 22, stroke: 3.5 },
  lg: { box: 76, stroke: 5 },
} as const;

type Tone = "primary" | "warning" | "destructive" | "muted";

const TONE_CLASSES: Record<Tone, string> = {
  primary: "text-primary",
  warning: "text-warning",
  destructive: "text-destructive",
  muted: "text-muted-foreground/60",
};

// REGLA: el coral es solo de la mascota; el riesgo usa los tokens de estado (DESIGN.md, "The Coral Is the Kraken Rule").
export function bagTone(bag: Pick<BagSummary, "status" | "riskReasons">): Tone {
  if (bag.status === "VENCIDA" || bag.status === "CERRADA") return "muted";
  if (bag.status === "AGOTADA") return "destructive";
  return bag.riskReasons.includes("CONSUMO") ? "warning" : "primary";
}

type Props = {
  pct: number;
  status: BagStatus;
  tone: Tone;
  size?: keyof typeof SIZES;
  className?: string;
};

export function HourBagRing({
  pct,
  status,
  tone,
  size = "sm",
  className,
}: Props) {
  const { box, stroke } = SIZES[size];
  const radius = (box - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const isEnded = status === "VENCIDA" || status === "CERRADA";
  return (
    <svg
      width={box}
      height={box}
      viewBox={`0 0 ${box} ${box}`}
      role="img"
      aria-label={`${pct}% consumido`}
      className={cn("shrink-0 -rotate-90", TONE_CLASSES[tone], className)}
    >
      <circle
        cx={box / 2}
        cy={box / 2}
        r={radius}
        fill="none"
        strokeWidth={stroke}
        className="stroke-border"
        strokeDasharray={
          isEnded ? `${stroke * 0.6} ${stroke * 1.2}` : undefined
        }
      />
      {pct > 0 && (
        // POR QUÉ: el único movimiento de la pantalla; el arco viaja del valor anterior al nuevo tras un ajuste.
        <circle
          cx={box / 2}
          cy={box / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct / 100)}
          className="transition-[stroke-dashoffset] duration-[420ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none"
        />
      )}
    </svg>
  );
}
