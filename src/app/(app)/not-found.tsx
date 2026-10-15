// src/app/(app)/not-found.tsx
// Página que no existe o que no se puede ver, dentro del marco de la app: dice qué pasó y adónde ir
// (AGENTS.md §5, estados vacíos y errores). Un registro fuera del alcance responde igual, sin revelar que existe.
import Link from "next/link";
import { KrakenEmpty } from "@/components/brand/kraken-empty";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8 sm:px-6">
      <KrakenEmpty mood="curious" title="No encontramos esta página.">
        Puede que el enlace esté mal, que el registro ya no exista o que no
        tengas acceso. Vuelve al inicio o pide acceso a tu gerente.
      </KrakenEmpty>
      <Link href="/inicio" className={`${buttonVariants()} self-center`}>
        Ir al inicio
      </Link>
    </main>
  );
}
