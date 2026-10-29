// src/components/theme/mode-toggle.tsx
// Botón que alterna el tema claro y oscuro: el tema nuevo se revela en círculo desde el botón con la View
// Transitions API (adaptado de Magic UI, animated-theme-toggler). Sin soporte o con reduced motion cambia al instante.

"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import type { MouseEvent } from "react";
import { flushSync } from "react-dom";

import { Button } from "@/components/ui/button";

const DURATION_MS = 450;

export function ModeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();

  function toggle(event: MouseEvent<HTMLButtonElement>) {
    const root = document.documentElement;
    if (root.dataset.themeReveal) return;
    const next = resolvedTheme === "dark" ? "light" : "dark";
    // TRAMPA: next-themes aplica la clase en un efecto; la transición fotografía el DOM al salir del callback,
    // así que la clase se pone aquí mismo.
    const apply = () => {
      root.classList.toggle("dark", next === "dark");
      setTheme(next);
    };
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduced || typeof document.startViewTransition !== "function") {
      apply();
      return;
    }
    const { left, top, width, height } =
      event.currentTarget.getBoundingClientRect();
    const clipPath = revealClipPaths(left + width / 2, top + height / 2);
    root.dataset.themeReveal = "active";
    root.style.setProperty("--theme-reveal-from", clipPath[0]);
    const transition = document.startViewTransition(() => flushSync(apply));
    transition.ready
      .then(() =>
        root.animate(
          { clipPath },
          {
            duration: DURATION_MS,
            easing: "cubic-bezier(0.65, 0, 0.35, 1)",
            fill: "forwards",
            pseudoElement: "::view-transition-new(root)",
          },
        ),
      )
      .catch(() => {});
    transition.finished
      .finally(() => {
        delete root.dataset.themeReveal;
        root.style.removeProperty("--theme-reveal-from");
      })
      .catch(() => {});
  }

  return (
    <Button
      variant="outline"
      size="icon"
      className={className}
      onClick={toggle}
      aria-label="Cambiar tema"
    >
      <Sun className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
    </Button>
  );
}

// TRAMPA: en Chrome con escala fraccional (Windows al 150 %) un clip-path en px cae corrido en la primera
// transición; en porcentajes de la vista no (Magic UI #989).
function revealClipPaths(x: number, y: number): [string, string] {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const at = `at ${(x / w) * 100}% ${(y / h) * 100}%`;
  const radius = Math.hypot(Math.max(x, w - x), Math.max(y, h - y));
  // POR QUÉ: un radio de circle() en % se resuelve contra hypot(w, h) / √2 de la caja.
  const radiusPct = (radius / (Math.hypot(w, h) / Math.SQRT2)) * 100;
  return [`circle(0% ${at})`, `circle(${radiusPct}% ${at})`];
}
