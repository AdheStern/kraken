// src/components/ui/folder.tsx
// Carpeta animada con hojas que asoman (adaptada de rare-ui folder-component con los tokens de la marca). No tiene
// estado: el padre motion le propaga las variantes "rest", "hover" y "open".
"use client";

import { motion, type Transition, type Variants } from "motion/react";
import { cn } from "@/lib/utils";

const WIDTH = 321;
const HEIGHT = 270;
const FLAP_PATH =
  "M0 25C0 11.1929 11.1929 0 25 0H136.084C143.044 0 149.689 2.90139 154.42 8.00608L178.08 33.5343C182.811 38.639 189.456 41.5404 196.416 41.5404H296C309.807 41.5404 321 52.7333 321 66.5404V216C321 229.807 309.807 241 296 241H25C11.1929 241 0 229.807 0 216V25Z";
const SPRING: Transition = { type: "spring", stiffness: 120, damping: 13 };
const later = (delay: number): Transition => ({ ...SPRING, delay });

// POR QUÉ: de derecha a izquierda; abierta, las hojas suben poco para no salirse de una tarjeta chica.
const SHEETS: Variants[] = [
  {
    rest: { x: 40, y: -10, rotate: 10, transition: SPRING },
    hover: { x: 40, y: -30, rotate: 14, transition: later(0.12) },
    open: { x: 70, y: -90, rotate: 18, transition: later(0.1) },
  },
  {
    rest: { x: 3, y: -20, rotate: 2, transition: SPRING },
    hover: { x: 3, y: -35, rotate: -1, transition: later(0.06) },
    open: { x: 0, y: -105, rotate: -3, transition: later(0.05) },
  },
  {
    rest: { x: -40, y: -22, rotate: -5, transition: SPRING },
    hover: { x: -40, y: -44, rotate: -9, transition: SPRING },
    open: { x: -65, y: -95, rotate: -14, transition: SPRING },
  },
];
const SHEET_KEYS = ["derecha", "medio", "izquierda"];
// REGLA: con una hoja asoma la del medio; con dos, se suma la de la derecha.
const SHEET_ORDER = [1, 0, 2];
const FLAP: Variants = {
  rest: { rotateX: -15 },
  hover: { rotateX: -45 },
  open: { rotateX: -55 },
};
// POR QUÉ: la hoja es papel: blanca y con renglones claros también en el tema oscuro.
const SHEET_LINE = "fill-[oklch(0.9_0.012_255)]";
const ROWS = [61, 75, 89, 103, 117, 131, 146, 160, 174];

type Props = {
  sheets: number;
  scale?: number;
  muted?: boolean;
  className?: string;
};

export function Folder({ sheets, scale = 0.4, muted, className }: Props) {
  const shown = new Set(SHEET_ORDER.slice(0, Math.min(sheets, 3)));
  return (
    <span
      aria-hidden="true"
      className={cn("relative block", className)}
      style={{ width: WIDTH * scale, height: HEIGHT * scale }}
    >
      <span
        className="absolute top-1/2 left-1/2"
        style={{
          width: WIDTH,
          height: HEIGHT,
          transform: `translate(-50%, -50%) scale(${scale})`,
          perspective: 800,
        }}
      >
        <span
          className={cn(
            "absolute inset-0 rounded-[25px] shadow-[inset_0_0_6px_2px_oklch(1_0_0/0.3)]",
            muted ? "bg-muted-foreground/45" : "bg-primary",
          )}
        />
        <span className="absolute inset-0 flex items-center justify-center">
          {SHEETS.map(
            (variants, i) =>
              shown.has(i) && (
                <motion.span
                  key={SHEET_KEYS[i]}
                  className="absolute"
                  variants={variants}
                >
                  <Sheet />
                </motion.span>
              ),
          )}
        </span>
        <motion.span
          className="absolute top-1/2 left-1/2 mt-4 -translate-x-1/2 -translate-y-1/2"
          style={{ width: 321, height: 241, transformOrigin: "bottom center" }}
          variants={FLAP}
          transition={{ ...SPRING, damping: 14 }}
        >
          <span
            className="absolute inset-0 backdrop-blur-[6px]"
            style={{ clipPath: `path('${FLAP_PATH}')` }}
          />
          <svg
            aria-hidden="true"
            className="absolute inset-0"
            viewBox="0 0 321 241"
            fill="none"
          >
            <path
              d={FLAP_PATH}
              fillOpacity={0.6}
              className={muted ? "fill-muted-foreground" : "fill-primary"}
            />
            <path
              d={FLAP_PATH}
              strokeOpacity={0.35}
              className="stroke-white"
              transform="translate(0.5 0.5) scale(0.997)"
            />
          </svg>
        </motion.span>
      </span>
    </span>
  );
}

function Sheet() {
  return (
    <svg
      aria-hidden="true"
      width="164"
      height="214"
      viewBox="0 0 164 214"
      fill="none"
    >
      <rect
        x="0.5"
        y="0.5"
        width="163"
        height="213"
        rx="19.5"
        className="fill-white stroke-black/10"
      />
      <rect
        x="14"
        y="31"
        width="135"
        height="12"
        rx="6"
        className={SHEET_LINE}
      />
      {ROWS.map((y) => (
        <g key={y} className={SHEET_LINE}>
          <rect x="15" y={y} width="64.5" height="6" rx="3" />
          <rect x="84.5" y={y} width="64.5" height="6" rx="3" />
        </g>
      ))}
    </svg>
  );
}
