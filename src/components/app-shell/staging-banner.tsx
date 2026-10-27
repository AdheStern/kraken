// src/components/app-shell/staging-banner.tsx
// Franja «Entorno de pruebas» en todas las pantallas cuando APP_ENV=staging, para que nadie confunda staging con
// producción. Va dentro de un <Suspense> porque lee el entorno al atender la petición.
import { FlaskConical } from "lucide-react";
import { connection } from "next/server";
import { isStagingEnv } from "@/server/app-env";

export async function StagingBanner() {
  // TRAMPA: la misma imagen corre en staging y producción; sin connection() el prerender congelaría APP_ENV del build.
  await connection();
  if (!isStagingEnv()) return null;
  return (
    <div className="flex items-center justify-center gap-2 border-b border-warning bg-warning/15 px-3 py-1 text-center text-sm font-medium">
      <FlaskConical className="size-4 shrink-0 text-warning" aria-hidden />
      Entorno de pruebas: los datos no son reales y los correos no salen de
      staging.
    </div>
  );
}
