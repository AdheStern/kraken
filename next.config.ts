// next.config.ts
// Configuración de Next.js: Cache Components, compilador de React, Tailwind en Turbopack, plantillas
// incluidas en el trazado, cabeceras de seguridad y redirecciones.
import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// POR QUÉ: Cache Components con prerenderizado parcial no admite CSP con nonce (la guía de Next lo marca como
// incompatible); se usa la variante sin nonce. LIMITACIÓN: script-src lleva 'unsafe-inline' por los scripts
// que Next y el tema inyectan; el resto de la política sigue cerrada a este origen.
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://login.microsoftonline.com",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  // REGLA: HSTS lo envía la app (la FortiGate termina TLS y no lo agrega); también reemplaza a
  // upgrade-insecure-requests, que rompería el E2E por http en localhost.
  ...(isDev
    ? []
    : [
        {
          key: "Strict-Transport-Security",
          value: "max-age=31536000; includeSubDomains",
        },
      ]),
];

const nextConfig: NextConfig = {
  // POR QUÉ: la imagen Docker lleva solo el servidor trazado, no todo node_modules (ADR-13).
  output: "standalone",
  poweredByHeader: false,
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
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // POR QUÉ: el inicio de cada rol vive en /inicio (AGENTS.md §5); la raíz solo redirige.
  async redirects() {
    return [{ source: "/", destination: "/inicio", permanent: false }];
  },
};

export default nextConfig;
