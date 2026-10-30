// src/features/sales-control/components/lines/excel-palette.ts
// Paleta de relleno de Excel (tema de Office): 10 colores del tema con sus 5 variaciones y los 10 estándar,
// como RRGGBB. Es la que los comerciales ya usan para resaltar filas de la planilla.
import type { CSSProperties } from "react";

export type PaletteColumn = { name: string; shades: string[] };

// POR QUÉ: Blanco y Negro no tienen las variaciones de los demás (Excel oscurece el blanco y aclara el negro).
const LIGHTER = [
  "",
  "claro 80 %",
  "claro 60 %",
  "claro 40 %",
  "oscuro 25 %",
  "oscuro 50 %",
];
const WHITE = [
  "",
  "oscuro 5 %",
  "oscuro 15 %",
  "oscuro 25 %",
  "oscuro 35 %",
  "oscuro 50 %",
];
const BLACK = [
  "",
  "claro 50 %",
  "claro 35 %",
  "claro 25 %",
  "claro 15 %",
  "claro 5 %",
];

export const THEME_COLUMNS: (PaletteColumn & { labels: string[] })[] = [
  {
    name: "Blanco",
    labels: WHITE,
    shades: ["FFFFFF", "F2F2F2", "D9D9D9", "BFBFBF", "A6A6A6", "808080"],
  },
  {
    name: "Negro",
    labels: BLACK,
    shades: ["000000", "808080", "595959", "404040", "262626", "0D0D0D"],
  },
  {
    name: "Gris claro",
    labels: LIGHTER,
    shades: ["E7E6E6", "D0CECE", "AEAAAA", "757171", "3A3838", "161616"],
  },
  {
    name: "Azul oscuro",
    labels: LIGHTER,
    shades: ["44546A", "D6DCE4", "ACB9CA", "8497B0", "333F4F", "222B35"],
  },
  {
    name: "Azul",
    labels: LIGHTER,
    shades: ["4472C4", "D9E1F2", "B4C6E7", "8EA9DB", "305496", "203764"],
  },
  {
    name: "Naranja",
    labels: LIGHTER,
    shades: ["ED7D31", "FCE4D6", "F8CBAD", "F4B084", "C65911", "833C0C"],
  },
  {
    name: "Gris",
    labels: LIGHTER,
    shades: ["A5A5A5", "EDEDED", "DBDBDB", "C9C9C9", "7B7B7B", "525252"],
  },
  {
    name: "Oro",
    labels: LIGHTER,
    shades: ["FFC000", "FFF2CC", "FFE699", "FFD966", "BF8F00", "806000"],
  },
  {
    name: "Azul claro",
    labels: LIGHTER,
    shades: ["5B9BD5", "DDEBF7", "BDD7EE", "9BC2E6", "2F75B5", "1F4E78"],
  },
  {
    name: "Verde",
    labels: LIGHTER,
    shades: ["70AD47", "E2EFDA", "C6E0B4", "A9D08E", "548235", "375623"],
  },
];

export const STANDARD_COLORS: { name: string; hex: string }[] = [
  { name: "Rojo oscuro", hex: "C00000" },
  { name: "Rojo", hex: "FF0000" },
  { name: "Naranja", hex: "FFC000" },
  { name: "Amarillo", hex: "FFFF00" },
  { name: "Verde claro", hex: "92D050" },
  { name: "Verde", hex: "00B050" },
  { name: "Azul claro", hex: "00B0F0" },
  { name: "Azul", hex: "0070C0" },
  { name: "Azul oscuro", hex: "002060" },
  { name: "Morado", hex: "7030A0" },
];

export function relativeLuminance(hex: string): number {
  const [r, g, b] = [0, 2, 4].map((i) => {
    const channel = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
    return channel <= 0.03928
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// POR QUÉ: 0.179 es donde el contraste WCAG con negro y con blanco se igualan.
export function isDarkFill(hex: string): boolean {
  return relativeLuminance(hex) <= 0.179;
}

// POR QUÉ: la fila redefine los tokens del tema que usan sus celdas (texto, íconos, bordes, fondo de inputs,
// resaltados) con capas de negro o blanco según su relleno, no según el modo claro u oscuro: los tokens del
// modo oscuro son grises claros que sobre un relleno claro o medio desaparecen. Las capas transparentes sirven
// sobre cualquier tono. Los menús se abren en un portal, fuera de la fila, con el tema normal.
export const INK_ON_LIGHT = {
  "--foreground": "rgb(0 0 0 / 1)",
  "--muted-foreground": "rgb(0 0 0 / 0.66)",
  "--border": "rgb(0 0 0 / 0.22)",
  "--input": "rgb(0 0 0 / 0.32)",
  "--muted": "rgb(0 0 0 / 0.07)",
  "--accent": "rgb(0 0 0 / 0.1)",
  "--accent-foreground": "rgb(0 0 0 / 1)",
  "--ring": "rgb(0 0 0 / 0.6)",
  // Celda con foco: un velo blanco sobre el relleno, nunca el fondo del tema.
  "--background": "rgb(255 255 255 / 0.6)",
  "--primary": "oklch(0.42 0.17 256)",
  "--destructive": "oklch(0.47 0.2 27)",
  "--warning": "oklch(0.45 0.12 65)",
  "--success": "oklch(0.4 0.11 155)",
  colorScheme: "light",
};

export const INK_ON_DARK = {
  "--foreground": "rgb(255 255 255 / 1)",
  "--muted-foreground": "rgb(255 255 255 / 0.8)",
  "--border": "rgb(255 255 255 / 0.32)",
  "--input": "rgb(255 255 255 / 0.42)",
  "--muted": "rgb(255 255 255 / 0.12)",
  "--accent": "rgb(255 255 255 / 0.16)",
  "--accent-foreground": "rgb(255 255 255 / 1)",
  "--ring": "rgb(255 255 255 / 0.75)",
  "--background": "rgb(0 0 0 / 0.3)",
  "--primary": "oklch(0.86 0.09 252)",
  "--destructive": "oklch(0.84 0.12 24)",
  "--warning": "oklch(0.88 0.13 85)",
  "--success": "oklch(0.86 0.12 155)",
  colorScheme: "dark",
};

export function rowColorStyle(hex: string | null): CSSProperties | undefined {
  if (!hex) return undefined;
  const ink = isDarkFill(hex) ? INK_ON_DARK : INK_ON_LIGHT;
  return {
    ...ink,
    backgroundColor: `#${hex}`,
    color: "var(--foreground)",
  } as CSSProperties;
}
