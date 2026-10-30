// src/components/ui/gooey-nav.tsx
// Pestañas "gooey": la elegida se separa del grupo y la unen al resto cuellos que se estiran y se cortan (adaptado de
// rare-ui gooey-nav con los tokens de la marca). Sirve para enlaces (cada pestaña es una URL) o dentro de un <Tabs>.
"use client";

import { Tabs } from "@base-ui/react/tabs";
import {
  motion,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";
import Link from "next/link";
import { type ReactNode, useEffect, useId, useRef } from "react";
import { cn } from "@/lib/utils";

const SPRING = {
  type: "spring",
  stiffness: 200,
  damping: 28,
  mass: 1,
} as const;
// POR QUÉ: con la separación abierta hasta esta fracción, el cuello ya se adelgazó a nada.
const NECK_BREAK = 0.22;
const NECK_H = 100;
const SEPARATION = 14;
const RADIUS = 10;

export type GooeyNavItem = { key: string; label: ReactNode; href?: string };

type Props = {
  items: readonly GooeyNavItem[];
  active: string;
  label: string;
  // "tabs": va dentro de un <Tabs> de Base UI y cada clave es el value de su panel; conserva teclado y roles.
  mode?: "links" | "tabs";
  className?: string;
};

export function GooeyNav({
  items,
  active,
  label,
  mode = "links",
  className,
}: Props) {
  const reduced = useReducedMotion() ?? false;
  const activeIndex = items.findIndex((item) => item.key === active);
  const scroller = useRef<HTMLDivElement>(null);
  const isFirst = useRef(true);

  // POR QUÉ: en el móvil la barra se desplaza; la pestaña elegida no debe quedar fuera de la vista.
  useEffect(() => {
    if (isFirst.current || activeIndex < 0) {
      isFirst.current = false;
      return;
    }
    scroller.current
      ?.querySelector("[data-gooey-active]")
      ?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [activeIndex]);

  const open = (seam: number) =>
    seam === 0 ||
    seam === items.length ||
    seam - 1 === activeIndex ||
    seam === activeIndex;
  const fill = (i: number) =>
    i === activeIndex ? "var(--primary)" : "currentColor";

  const segments = items.map((item, i) => {
    const isActive = i === activeIndex;
    const itemClass = cn(
      "flex items-center gap-1.5 rounded-[10px] px-3.5 py-1.5 text-sm font-medium whitespace-nowrap outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
      isActive
        ? "text-primary-foreground duration-400"
        : "text-muted-foreground duration-0 hover:text-foreground",
    );
    return (
      <Segment
        key={item.key}
        role={mode === "links" ? "listitem" : "none"}
        // POR QUÉ: una costura cerrada se mete un píxel para que no se vea una línea fina entre pestañas.
        gap={i === 0 ? 0 : open(i) ? SEPARATION : -1}
        hasSeam={i > 0}
        leftFill={fill(i - 1)}
        rightFill={fill(i)}
        reduced={reduced}
        radii={{
          borderTopLeftRadius: open(i) ? RADIUS : 0,
          borderBottomLeftRadius: open(i) ? RADIUS : 0,
          borderTopRightRadius: open(i + 1) ? RADIUS : 0,
          borderBottomRightRadius: open(i + 1) ? RADIUS : 0,
        }}
        isActive={isActive}
      >
        {mode === "tabs" ? (
          <Tabs.Tab value={item.key} className={itemClass}>
            {item.label}
          </Tabs.Tab>
        ) : (
          <Link
            href={item.href ?? "#"}
            aria-current={isActive ? "page" : undefined}
            className={itemClass}
          >
            {item.label}
          </Link>
        )}
      </Segment>
    );
  });

  const bar = "flex w-max items-center py-0.5";
  return (
    <div
      ref={scroller}
      className={cn(
        "-mx-1 overflow-x-auto px-1 [scrollbar-width:none]",
        className,
      )}
    >
      {mode === "tabs" ? (
        <Tabs.List aria-label={label} className={bar}>
          {segments}
        </Tabs.List>
      ) : (
        <nav aria-label={label}>
          <div role="list" className={bar}>
            {segments}
          </div>
        </nav>
      )}
    </div>
  );
}

// Dos curvas cóncavas que se estrechan hacia el centro, dibujadas en el hueco que dejan las pestañas.
function neckPath(gap: number) {
  if (!Number.isFinite(gap) || gap <= 0) return "";
  const waist = NECK_H * (1 - gap / (SEPARATION * NECK_BREAK));
  if (waist <= 0) return "";
  const start = SEPARATION - gap;
  const mid = start + gap / 2;
  return `M${start} 0 Q${mid} ${NECK_H - waist} ${SEPARATION} 0 L${SEPARATION} ${NECK_H} Q${mid} ${waist} ${start} ${NECK_H} Z`;
}

type SegmentProps = {
  role: "listitem" | "none";
  gap: number;
  hasSeam: boolean;
  leftFill: string;
  rightFill: string;
  reduced: boolean;
  radii: Record<string, number>;
  isActive: boolean;
  children: ReactNode;
};

function Segment(props: SegmentProps) {
  const { gap, hasSeam, reduced, isActive } = props;
  const marginLeft = useSpring(gap, SPRING);
  const gradientId = `gooey-neck-${useId().replace(/:/g, "")}`;

  useEffect(() => {
    if (reduced) marginLeft.jump(gap);
    else marginLeft.set(gap);
  }, [gap, marginLeft, reduced]);

  const d = useTransform(marginLeft, neckPath);

  return (
    <motion.div
      role={props.role}
      data-gooey-active={isActive || undefined}
      className={cn(
        "relative transition-colors",
        isActive ? "bg-primary duration-400" : "bg-muted duration-0",
      )}
      style={{ marginLeft }}
      initial={false}
      animate={props.radii}
      transition={reduced ? { duration: 0 } : SPRING}
    >
      {hasSeam && (
        <svg
          aria-hidden="true"
          width={SEPARATION}
          viewBox={`0 0 ${SEPARATION} ${NECK_H}`}
          preserveAspectRatio="none"
          className="pointer-events-none absolute top-0 right-full h-full text-muted"
        >
          <defs>
            <linearGradient id={gradientId} x1="0" x2="1">
              <stop offset="0" style={{ stopColor: props.leftFill }} />
              <stop offset="1" style={{ stopColor: props.rightFill }} />
            </linearGradient>
          </defs>
          <motion.path d={d} fill={`url(#${gradientId})`} />
        </svg>
      )}
      {props.children}
    </motion.div>
  );
}
