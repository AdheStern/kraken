// src/features/inventory/components/pos-workspace.tsx
// Marco de POS de supermercado para tablet: los productos a la izquierda y la operación en un panel fijo a la
// derecha. En vertical el panel se pega abajo como una barra «N artículos · Ver» que se despliega.
"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { type ReactNode, useState } from "react";
import { cn } from "@/lib/utils";

type Props = {
  products: ReactNode;
  title: string;
  // Resumen de la barra en vertical («3 artículos»).
  summary: string;
  panel: ReactNode;
};

// POR QUÉ: un solo panel, con estilos que cambian por ancho, en vez de duplicarlo en una hoja: lo que se escribe
// en él (motivo, ticket) no se pierde al girar la tablet.
export function PosWorkspace({ products, title, summary, panel }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
      <section aria-label="Productos" className="grid content-start gap-4">
        {products}
      </section>
      <aside
        data-tour="pos-panel"
        aria-label={title}
        className="kr-solid sticky bottom-3 z-20 flex max-h-[80dvh] flex-col overflow-hidden rounded-xl lg:top-4 lg:bottom-auto lg:max-h-[calc(100dvh-2rem)]"
      >
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="flex h-14 shrink-0 items-center justify-between gap-3 px-4 text-left font-medium lg:hidden"
        >
          <span>
            {title} · <span className="tabular-nums">{summary}</span>
          </span>
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            {open ? "Ocultar" : "Ver"}
            {open ? (
              <ChevronDown className="size-4" aria-hidden="true" />
            ) : (
              <ChevronUp className="size-4" aria-hidden="true" />
            )}
          </span>
        </button>
        <h2 className="hidden px-4 pt-4 font-medium lg:block">
          {title} · <span className="tabular-nums">{summary}</span>
        </h2>
        <div
          className={cn(
            "grid min-h-0 content-start gap-4 overflow-y-auto p-4 max-lg:border-t lg:pt-3",
            !open && "max-lg:hidden",
          )}
        >
          {panel}
        </div>
      </aside>
    </div>
  );
}
