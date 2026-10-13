// src/features/auth/components/kraken-mascot.tsx
// Mascota viva del login: mira el puntero o el campo con foco y reacciona al ánimo compartido.
// Se dibuja dentro del SVG de la red (es un <g>), centrada en el nodo central.
"use client";

import { type RefObject, useEffect, useRef, useState } from "react";
import { KrakenFace } from "./kraken-face";
import { useKrakenMood } from "./kraken-mood";

const PUPIL_RANGE = 4;

type Point = { x: number; y: number };

export function KrakenMascot({
  x,
  y,
  scale,
}: {
  x: number;
  y: number;
  scale: number;
}) {
  const { mood } = useKrakenMood();
  const anchorRef = useRef<SVGGElement>(null);
  const pupil = useGaze(anchorRef);
  const isError = mood === "error";

  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <g ref={anchorRef} className="kr-bob">
        <g
          key={isError ? "error" : "calm"}
          className={isError ? "kr-shake" : undefined}
        >
          <KrakenFace pupil={pupil} mood={mood} />
        </g>
        {isError && (
          <g className="kr-ink">
            <circle cx="0" cy="70" r="16" className="fill-(--brand-ink)/50" />
            <circle cx="-18" cy="78" r="9" className="fill-(--brand-ink)/40" />
            <circle cx="17" cy="80" r="7" className="fill-(--brand-ink)/40" />
          </g>
        )}
      </g>
    </g>
  );
}

// POR QUÉ: con un campo enfocado el kraken mira el campo; si no, sigue al puntero.
function useGaze(anchorRef: RefObject<SVGGElement | null>): Point {
  const [pupil, setPupil] = useState<Point>({ x: 0, y: 0 });

  useEffect(() => {
    let frame = 0;
    let pointer: Point | null = null;

    const update = () => {
      frame = 0;
      const anchor = anchorRef.current;
      const target = focusedFieldCenter() ?? pointer;
      if (!anchor || !target) return;
      setPupil(towards(anchor.getBoundingClientRect(), target));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const onPointer = (event: PointerEvent) => {
      pointer = { x: event.clientX, y: event.clientY };
      schedule();
    };

    window.addEventListener("pointermove", onPointer, { passive: true });
    document.addEventListener("focusin", schedule);
    document.addEventListener("focusout", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onPointer);
      document.removeEventListener("focusin", schedule);
      document.removeEventListener("focusout", schedule);
    };
  }, [anchorRef]);

  return pupil;
}

function focusedFieldCenter(): Point | null {
  const active = document.activeElement;
  if (!(active instanceof HTMLInputElement)) return null;
  const rect = active.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

function towards(rect: DOMRect, target: Point): Point {
  const dx = target.x - (rect.left + rect.width / 2);
  const dy = target.y - (rect.top + rect.height / 2);
  const distance = Math.hypot(dx, dy) || 1;
  const reach = Math.min(1, distance / 240) * PUPIL_RANGE;
  return { x: (dx / distance) * reach, y: (dy / distance) * reach };
}
