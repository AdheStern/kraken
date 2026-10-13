// src/features/auth/components/network-layout.ts
// Geometría de la red del panel de marca (viewBox 600×600): módulos, nodos satélite y tentáculos.
// La comparten el SVG y los rótulos de vidrio para que queden alineados.

export const NETWORK_SIZE = 600;

export const KRAKEN_CENTER = { x: 300, y: 250, scale: 1.35 };

export const MODULE_NODES = [
  {
    id: "cv",
    label: "Control de Venta",
    x: 92,
    y: 300,
    tentacle: "M262 302C220 350 160 262 110 296",
  },
  {
    id: "horas",
    label: "Horas",
    x: 150,
    y: 478,
    tentacle: "M276 308C250 380 170 390 158 458",
  },
  {
    id: "tickets",
    label: "Tickets",
    x: 300,
    y: 540,
    tentacle: "M300 312C322 380 280 450 300 520",
  },
  {
    id: "inventario",
    label: "Inventario",
    x: 450,
    y: 478,
    tentacle: "M324 308C350 380 430 390 442 458",
  },
  {
    id: "tableros",
    label: "Tableros",
    x: 508,
    y: 300,
    tentacle: "M338 302C380 350 440 262 490 296",
  },
] as const;

export const SATELLITE_NODES = [
  { x: 128, y: 150 },
  { x: 300, y: 62 },
  { x: 470, y: 128 },
] as const;

// POR QUÉ: un solo trazo cerrado permite que la señal recorra toda la red sin saltos.
export const NETWORK_LOOP = [
  MODULE_NODES[0],
  MODULE_NODES[1],
  MODULE_NODES[2],
  MODULE_NODES[3],
  MODULE_NODES[4],
  SATELLITE_NODES[2],
  SATELLITE_NODES[1],
  SATELLITE_NODES[0],
]
  .map((node, index) => `${index === 0 ? "M" : "L"}${node.x} ${node.y}`)
  .join("")
  .concat("Z");

export function toPercent(value: number): string {
  return `${(value / NETWORK_SIZE) * 100}%`;
}
