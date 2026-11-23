// src/app/layout.tsx
// Layout raíz: fuentes, estilos globales, proveedor de tema y el aviso de staging para toda la app.

import type { Metadata } from "next";
import { Geist, Geist_Mono, Nunito } from "next/font/google";
import localFont from "next/font/local";
import { Suspense } from "react";
import { StagingBanner } from "@/components/app-shell/staging-banner";
import { ThemeProvider } from "@/components/theme/theme-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// POR QUÉ: solo el wordmark "Kraken" usa Nunito; sus terminales redondeadas acompañan a la mascota.
const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["900"],
});

// POR QUÉ: Windows no dibuja los emoji de bandera (muestra «BO»); esta fuente (Twemoji, CC-BY 4.0, vía
// country-flag-emoji-polyfill) cubre solo esos caracteres y se descarga cuando aparece una bandera.
const flags = localFont({
  src: "../../node_modules/country-flag-emoji-polyfill/dist/TwemojiCountryFlags.woff2",
  variable: "--font-flags",
  preload: false,
  adjustFontFallback: false,
  declarations: [
    {
      prop: "unicode-range",
      value:
        "U+1F1E6-1F1FF, U+1F3F4, U+E0062-E0063, U+E0065, U+E0067, U+E006C, U+E006E, U+E0073-E0074, U+E0077, U+E007F",
    },
  ],
});

const DESCRIPTION =
  "Kraken by DIMA: control de venta, horas, tickets e inventario de DIMA Ltda. en un solo lugar.";

export const metadata: Metadata = {
  // POR QUÉ: la vista previa de un enlace necesita la URL absoluta de la imagen, y el HTML se prerenderiza en
  // el build, donde no está BETTER_AUTH_URL. Staging muestra la misma imagen, que es solo la marca.
  metadataBase: new URL("https://kraken.dima.com.bo"),
  title: { default: "Kraken", template: "%s · Kraken" },
  description: DESCRIPTION,
  // REGLA: app interna detrás de login; no se indexa (también robots.txt).
  robots: { index: false, follow: false },
  openGraph: {
    siteName: "Kraken by DIMA",
    locale: "es_BO",
    type: "website",
    description: DESCRIPTION,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${nunito.variable} ${flags.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Suspense fallback={null}>
            <StagingBanner />
          </Suspense>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
