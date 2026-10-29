// src/app/layout.tsx
// Layout raíz: fuentes, estilos globales, proveedor de tema y el aviso de staging para toda la app.

import type { Metadata } from "next";
import { Geist, Geist_Mono, Nunito } from "next/font/google";
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
      className={`${geistSans.variable} ${geistMono.variable} ${nunito.variable} h-full antialiased`}
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
