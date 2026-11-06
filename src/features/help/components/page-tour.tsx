// src/features/help/components/page-tour.tsx
// Botón «Recorrido» de una pantalla: la primera vez que la persona entra se ofrece solo; después, a pedido
// (driver.js, decisión 2026-11-05). Los pasos cuyo elemento no existe para su rol se saltan.
"use client";

import { Compass } from "lucide-react";
import { useEffect, useEffectEvent } from "react";
import { Button } from "@/components/ui/button";
import { markTourSeen } from "../actions/mark-tour-seen";
import { wasTourSeen } from "../actions/was-tour-seen";
import { TOURS, type TourId } from "../tours/tour-registry";

// POR QUÉ: espera a que la pantalla termine de dibujar lo que llega por streaming antes de buscar los elementos.
const AUTO_START_DELAY_MS = 900;

export function PageTour({ id }: { id: TourId }) {
  const start = useEffectEvent(() => void runTour(id));

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      const seen = await wasTourSeen(id);
      if (!cancelled && seen.ok && !seen.data) start();
    }, AUTO_START_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [id]);

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => void runTour(id)}
      title="Ver el recorrido de esta pantalla"
    >
      <Compass aria-hidden="true" />
      Recorrido
    </Button>
  );
}

async function runTour(id: TourId) {
  // POR QUÉ: la librería y su hoja de estilos se cargan solo cuando alguien abre un recorrido.
  const [{ driver }] = await Promise.all([
    import("driver.js"),
    import("driver.js/dist/driver.css"),
  ]);
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const tour = driver({
    animate: !reduced,
    smoothScroll: !reduced,
    showProgress: true,
    skipMissingElement: true,
    popoverClass: "kr-tour",
    progressText: "{{current}} de {{total}}",
    nextBtnText: "Siguiente",
    prevBtnText: "Anterior",
    doneBtnText: "Listo",
    closeBtnLabel: "Cerrar el recorrido",
    steps: TOURS[id].steps.map((step) => ({
      element: step.element,
      popover: { title: step.title, description: step.description },
    })),
    onDestroyed: () => void markTourSeen(id),
  });
  tour.drive();
}
