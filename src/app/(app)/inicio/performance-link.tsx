// src/app/(app)/inicio/performance-link.tsx
// Acceso del ingeniero a su desempeño del mes desde Inicio: tiempo, tickets y SLA en Tableros → Ingenieros
// (AGENTS.md §6).
import { ArrowRight, Gauge } from "lucide-react";
import Link from "next/link";

export function PerformanceLink({ userId }: { userId: string }) {
  return (
    <Link
      href={`/tableros/ingenieros/${userId}`}
      className="kr-surface kr-lift flex items-center gap-3 rounded-xl px-4 py-3 text-sm"
    >
      <Gauge className="size-5 text-primary" aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="font-medium">Mi desempeño</span>
        <span className="text-muted-foreground">
          {" "}
          · tu tiempo registrado, tus tickets y tu SLA de este mes
        </span>
      </span>
      <ArrowRight className="size-4 text-muted-foreground" aria-hidden="true" />
    </Link>
  );
}
