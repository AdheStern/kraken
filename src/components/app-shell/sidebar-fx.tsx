// src/components/app-shell/sidebar-fx.tsx
// Tarjeta del riel con el TC oficial vigente (BCB): valor y desde cuándo rige; avisa si está atrasado. Colapsado
// el riel, no se muestra. Va dentro de un <Suspense> (AGENTS.md §2.2).
import { TriangleAlert } from "lucide-react";
import { getCurrentFx } from "@/server/fx/get-current-fx";
import { requireUser } from "@/server/session";

const dateFormat = new Intl.DateTimeFormat("es-BO", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

export async function SidebarFx() {
  // TRAMPA: con Cache Components, leer la hora (getCurrentFx) exige pasar antes por algo dinámico como la sesión.
  await requireUser();
  const fx = await getCurrentFx();
  return (
    <div className="mx-2 rounded-lg bg-sidebar-accent/60 px-3 py-2 group-data-[collapsible=icon]:hidden">
      <p className="text-[11px] text-sidebar-foreground/70">TC oficial BCB</p>
      {fx ? (
        <>
          <p className="text-lg font-semibold tabular-nums leading-tight">
            Bs {fx.rate}
          </p>
          <p className="flex items-center gap-1 text-[11px] text-sidebar-foreground/70">
            {fx.isStale && (
              <TriangleAlert className="size-3 shrink-0" aria-hidden="true" />
            )}
            {fx.isStale ? "Atrasado: rige desde el " : "Rige desde el "}
            {dateFormat.format(new Date(`${fx.effectiveOn}T00:00:00Z`))}
          </p>
        </>
      ) : (
        <p className="text-xs text-sidebar-foreground/70">Sin TC cargado</p>
      )}
    </div>
  );
}
