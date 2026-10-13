// src/app/layout.tsx
// Layout raíz: fuentes, estilos globales y proveedor de tema para toda la app.

import type { Metadata } from "next";
import { Geist, Geist_Mono, Nunito } from "next/font/google";
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

export const metadata: Metadata = {
  title: { default: "Kraken", template: "%s · Kraken" },
  description:
    "Kraken by DIMA: control de venta, horas, tickets e inventario de DIMA Ltda. en un solo lugar.",
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
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
