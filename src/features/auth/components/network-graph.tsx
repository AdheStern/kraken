// src/features/auth/components/network-graph.tsx
// Red de nodos al estilo del isotipo DIMA con el kraken al centro: cada tentáculo llega a un módulo.
import { KrakenMascot } from "./kraken-mascot";
import {
  KRAKEN_CENTER,
  MODULE_NODES,
  NETWORK_LOOP,
  NETWORK_SIZE,
  SATELLITE_NODES,
} from "./network-layout";

const RING_MASK_ID = "kr-ring-mask";

export function NetworkGraph({ className }: { className?: string }) {
  return (
    <svg
      viewBox={`0 0 ${NETWORK_SIZE} ${NETWORK_SIZE}`}
      className={className}
      role="img"
      aria-label="El kraken de DIMA conecta Control de Venta, Horas, Tickets, Inventario y Tableros"
    >
      {/* POR QUÉ: los anillos son huecos; la máscara evita que las aristas se vean dentro de ellos. */}
      <mask id={RING_MASK_ID} maskUnits="userSpaceOnUse">
        <rect width={NETWORK_SIZE} height={NETWORK_SIZE} fill="white" />
        {MODULE_NODES.map((node) => (
          <circle key={node.id} cx={node.x} cy={node.y} r="16" fill="black" />
        ))}
        {SATELLITE_NODES.map((node) => (
          <circle
            key={`${node.x}-${node.y}`}
            cx={node.x}
            cy={node.y}
            r="8"
            fill="black"
          />
        ))}
      </mask>
      <g mask={`url(#${RING_MASK_ID})`}>
        <path
          d={NETWORK_LOOP}
          strokeWidth="2"
          className="fill-none stroke-white/30"
        />
        <path
          d={NETWORK_LOOP}
          pathLength={1000}
          strokeWidth="3"
          strokeLinecap="round"
          className="kr-signal fill-none stroke-white"
        />
      </g>

      {MODULE_NODES.map((node) => (
        <path
          key={node.id}
          d={node.tentacle}
          strokeWidth="9"
          strokeLinecap="round"
          className="fill-none stroke-(--coral)"
        />
      ))}

      {SATELLITE_NODES.map((node) => (
        <circle
          key={`${node.x}-${node.y}`}
          cx={node.x}
          cy={node.y}
          r="7"
          strokeWidth="3.5"
          className="fill-none stroke-white/70"
        />
      ))}
      {MODULE_NODES.map((node) => (
        <circle
          key={node.id}
          cx={node.x}
          cy={node.y}
          r="14"
          strokeWidth="5"
          className="fill-none stroke-white"
        />
      ))}

      <KrakenMascot
        x={KRAKEN_CENTER.x}
        y={KRAKEN_CENTER.y}
        scale={KRAKEN_CENTER.scale}
      />
    </svg>
  );
}
