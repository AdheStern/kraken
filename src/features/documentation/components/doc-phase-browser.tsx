// src/features/documentation/components/doc-phase-browser.tsx
// Fases de un proyecto como explorador de carpetas: cada fase es una carpeta con tantas hojas como contenido (hasta
// tres); la elegida se abre y debajo se ven sus documentos y lecciones (AGENTS.md §2.10).
"use client";

import { Tabs } from "@base-ui/react/tabs";
import { MotionConfig, motion } from "motion/react";
import { useState } from "react";
import { Folder } from "@/components/ui/folder";
import type { DocPhaseView } from "../types";
import { DocPhaseSection } from "./doc-phase-section";
import { phaseCountText } from "./phase-count-text";

type Props = {
  projectId: string;
  phases: DocPhaseView[];
  canUpload: boolean;
};

export function DocPhaseBrowser({ projectId, phases, canUpload }: Props) {
  const [selected, setSelected] = useState(phases[0]?.id);
  return (
    // REGLA: con reduced motion las carpetas cambian de estado sin moverse (DESIGN.md).
    <MotionConfig reducedMotion="user">
      <Tabs.Root
        value={selected}
        onValueChange={(value) => setSelected(String(value))}
        className="grid gap-4"
      >
        <Tabs.List
          aria-label="Fases del proyecto"
          className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(11rem,1fr))]"
        >
          {phases.map((phase) => {
            const isOpen = phase.id === selected;
            return (
              <Tabs.Tab
                key={phase.id}
                value={phase.id}
                className="kr-surface flex rounded-xl text-center outline-none transition-shadow focus-visible:ring-3 focus-visible:ring-ring/50 data-active:ring-2 data-active:ring-primary/50"
              >
                <motion.span
                  initial={false}
                  animate={isOpen ? "open" : "rest"}
                  whileHover={isOpen ? undefined : "hover"}
                  className="flex w-full flex-col items-center justify-start gap-2 px-3 pt-10 pb-3"
                >
                  <Folder
                    sheets={phase.documents.length + phase.lessons.length}
                    muted={!phase.isActive}
                  />
                  <span className="line-clamp-2 text-sm font-medium">
                    {phase.name}
                  </span>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {phase.isActive ? phaseCountText(phase) : "Dada de baja"}
                  </span>
                </motion.span>
              </Tabs.Tab>
            );
          })}
        </Tabs.List>
        {phases.map((phase) => (
          <Tabs.Panel key={phase.id} value={phase.id}>
            <DocPhaseSection
              projectId={projectId}
              phase={phase}
              canUpload={canUpload}
            />
          </Tabs.Panel>
        ))}
      </Tabs.Root>
    </MotionConfig>
  );
}
