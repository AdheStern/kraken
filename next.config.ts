// next.config.ts
// Configuración de Next.js: Cache Components, compilador de React, Tailwind en Turbopack, plantillas
// incluidas en el trazado y redirecciones.
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // POR QUÉ: la exportación lee la plantilla oficial desde disco; sin esto no viaja en la salida standalone.
  outputFileTracingIncludes: {
    "/api/cv/*/export.xlsx": ["./templates/PA-PR-03-RE-01.xlsx"],
  },
  // POR QUÉ: el inicio de cada rol vive en /inicio (AGENTS.md §5); la raíz solo redirige.
  async redirects() {
    return [{ source: "/", destination: "/inicio", permanent: false }];
  },
};

export default nextConfig;
