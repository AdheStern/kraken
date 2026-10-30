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

// POR QUÉ: en la grilla el texto va encima del relleno; sobre un fondo oscuro se lee en blanco.
export function textColorFor(hex: string): string {
  const [r, g, b] = [0, 2, 4].map((i) => {
    const channel = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
    return channel <= 0.03928
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  // POR QUÉ: 0.179 es donde el contraste WCAG con negro y con blanco se igualan.
  return luminance > 0.179 ? "#1a1a1a" : "#ffffff";
}

export function rowColorStyle(hex: string | null): CSSProperties | undefined {
  return hex
    ? { backgroundColor: `#${hex}`, color: textColorFor(hex) }
    : undefined;
}
