// src/features/admin/components/fx-sparkline.tsx
// Serie de 90 días del TC de venta en una línea con área, con su mínimo y máximo (AGENTS.md §2.2 panel de TC).
// POR QUÉ: SVG propio y no Recharts; una sola línea no justifica la dependencia (§0.14).
import type { FxPanel } from "../types";

const WIDTH = 600;
const HEIGHT = 120;
const PAD = 6;

export function FxSparkline({ series }: Pick<FxPanel, "series">) {
  if (series.length < 2)
    return (
      <p className="kr-surface rounded-xl p-5 text-sm text-muted-foreground">
        La serie aparece cuando haya al menos dos días con TC en los últimos 90.
      </p>
    );
  // LIMITACIÓN: Number solo para dibujar; los valores mostrados son el texto exacto guardado.
  const values = series.map((p) => Number(p.sellRate));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  // POR QUÉ: el eje es de fechas; los fines de semana y feriados sin TC no deben acortar la línea.
  const days = series.map((p) => Date.parse(p.date) / 86_400_000);
  const daySpan = days[days.length - 1] - days[0] || 1;
  const x = (i: number) =>
    PAD + ((days[i] - days[0]) / daySpan) * (WIDTH - 2 * PAD);
  const y = (v: number) =>
    HEIGHT - PAD - ((v - min) / span) * (HEIGHT - 2 * PAD);
  const line = values
    .map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`)
    .join(" ");
  const area = `${PAD},${HEIGHT - PAD} ${line} ${WIDTH - PAD},${HEIGHT - PAD}`;
  const minText = series[values.indexOf(min)].sellRate;
  const maxText = series[values.indexOf(max)].sellRate;
  const first = series[0];
  const last = series[series.length - 1];
  return (
    <figure className="kr-surface grid gap-2 rounded-xl p-5">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-32 w-full text-primary"
        preserveAspectRatio="none"
        role="img"
        aria-label={`TC de venta del ${first.date} al ${last.date}: mínimo ${minText}, máximo ${maxText}.`}
      >
        <defs>
          <linearGradient id="fx-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.22" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={area} fill="url(#fx-area)" />
        <polyline
          points={line}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
        />
      </svg>
      <figcaption className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground tabular-nums">
        <span>Desde {first.date}</span>
        <span>
          Mínimo {minText} · Máximo {maxText}
        </span>
        <span>Hasta {last.date}</span>
      </figcaption>
    </figure>
  );
}
