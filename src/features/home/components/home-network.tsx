// src/features/home/components/home-network.tsx
// Banda de Inicio sobre el campo azul DIMA: saludo a la izquierda y, a la derecha, la red con el kraken en el nodo
// central unido a cada módulo con su número vivo. Una señal recorre una vez los trazos que llevan a algo pendiente.
import Link from "next/link";
import { KrakenMark } from "@/components/brand/kraken-mark";
import { CountUp } from "@/components/motion/count-up";
import { cn } from "@/lib/utils";

export type HomeNode = {
  key: string;
  label: string;
  hint: string;
  value: number;
  href: string;
  isAlert: boolean;
};

// Posiciones de los nodos en % del área de la red; el kraken está en CENTER.
const CENTER = { x: 24, y: 50 };
const SLOTS = [
  { x: 50, y: 21 },
  { x: 82, y: 50 },
  { x: 50, y: 79 },
] as const;

type Props = { greeting: string; subtitle: string; nodes: HomeNode[] };

export function HomeNetwork({ greeting, subtitle, nodes }: Props) {
  const placed = nodes.slice(0, SLOTS.length);
  return (
    <section
      aria-label="Resumen"
      className="kr-panel relative overflow-hidden rounded-xl text-white shadow-[0_24px_60px_-28px_oklch(0.3_0.13_262/0.8)] md:grid md:min-h-72 md:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]"
    >
      <div className="relative z-10 flex flex-col justify-center gap-2 p-6 md:p-8">
        <h1 className="text-3xl font-semibold tracking-[-0.03em] md:text-4xl">
          {greeting}
        </h1>
        <p className="max-w-sm text-sm text-white/80">{subtitle}</p>
      </div>
      <div className="relative min-h-64">
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
          className="absolute inset-0 hidden size-full md:block"
        >
          {placed.map((node, i) => (
            <g key={node.key}>
              <line
                x1={CENTER.x}
                y1={CENTER.y}
                x2={SLOTS[i].x}
                y2={SLOTS[i].y}
                className="stroke-white/30"
                strokeWidth={2}
                vectorEffect="non-scaling-stroke"
              />
              {node.isAlert && (
                <line
                  x1={CENTER.x}
                  y1={CENTER.y}
                  x2={SLOTS[i].x}
                  y2={SLOTS[i].y}
                  className="kr-travel stroke-white"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                  pathLength={100}
                  style={{ animationDelay: `${450 + i * 180}ms` }}
                />
              )}
            </g>
          ))}
        </svg>
        <div
          className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-[5px] border-white/90 bg-(--panel-base) p-2 shadow-[0_0_0_10px_oklch(1_0_0/0.08)] max-md:static max-md:mx-6 max-md:w-fit max-md:translate-0"
          style={{ left: `${CENTER.x}%`, top: `${CENTER.y}%` }}
        >
          <KrakenMark
            className="size-16"
            mood={nodes.some((n) => n.isAlert) ? "alert" : "idle"}
          />
        </div>
        <ul className="grid grid-cols-2 gap-2 p-6 md:contents">
          {placed.map((node, i) => (
            <li
              key={node.key}
              className="md:absolute md:-translate-x-1/2 md:-translate-y-1/2"
              style={{ left: `${SLOTS[i].x}%`, top: `${SLOTS[i].y}%` }}
            >
              <Link
                href={node.href}
                className={cn(
                  "kr-glass-chip flex min-w-36 flex-col gap-0.5 rounded-xl px-4 py-2.5 transition-[background-color,transform] duration-200 hover:-translate-y-0.5 hover:bg-white/20 focus-visible:ring-3 focus-visible:ring-white/60 focus-visible:outline-none",
                  node.isAlert && "ring-1 ring-white/50",
                )}
              >
                <span className="text-xs text-white/80">{node.label}</span>
                <CountUp
                  value={node.value}
                  className="text-2xl font-semibold tabular-nums"
                />
                <span className="text-[11px] text-white/70">{node.hint}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
