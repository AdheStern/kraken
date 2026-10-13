// next.config.ts
// Configuración de Next.js: Cache Components, compilador de React, Tailwind en Turbopack y redirecciones.
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
  // POR QUÉ: el inicio de cada rol vive en /inicio (AGENTS.md §5); la raíz solo redirige.
  async redirects() {
    return [{ source: "/", destination: "/inicio", permanent: false }];
  },
};

export default nextConfig;
