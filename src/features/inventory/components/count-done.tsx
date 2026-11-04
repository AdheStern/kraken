// src/features/inventory/components/count-done.tsx
// Resultado del conteo físico: coincide con el sistema o cuántas diferencias pidieron su ajuste (AGENTS.md §2.8).
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export function CountDone({ differences }: { differences: number }) {
  return (
    <section
      className="kr-solid mx-auto grid w-full max-w-xl gap-4 rounded-xl p-6 text-center"
      aria-live="polite"
    >
      <h2 className="text-lg font-semibold">
        {differences === 0
          ? "El conteo coincide con el sistema."
          : `${differences} ${differences === 1 ? "diferencia" : "diferencias"}: se pidió el ajuste.`}
      </h2>
      <p className="text-sm text-muted-foreground">
        {differences === 0
          ? "No hay nada que ajustar en este almacén."
          : "Entra al kardex cuando lo aprueben Administración o el GG."}
      </p>
      {differences > 0 && (
        <Link
          href="/inventario/ajustes"
          className={buttonVariants({ className: "mx-auto h-12" })}
        >
          Ver el ajuste
        </Link>
      )}
    </section>
  );
}
