// next.config.ts
// Configuración de Next.js: Cache Components, compilador de React, Tailwind en Turbopack, plantillas
// incluidas en el trazado y redirecciones.
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // POR QUÉ: la imagen Docker lleva solo el servidor trazado, no todo node_modules (ADR-13).
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
  // REGLA: un adjunto pesa hasta 20 MB (MAX_ATTACHMENT_BYTES); el margen cubre los encabezados multipart.
  experimental: {
    serverActions: { bodySizeLimit: "21mb" },
    proxyClientMaxBodySize: "21mb",
  },
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
