// src/features/sales-control/components/lines/excel-palette.test.ts
// Contraste de una fila coloreada: con cualquier color de la paleta, el texto y los íconos que la fila redefine
// se leen sobre el relleno (WCAG: 4.5:1 el texto, 3:1 los íconos y textos atenuados), en modo claro y oscuro.
import { describe, expect, it } from "vitest";
import {
  INK_ON_DARK,
  INK_ON_LIGHT,
  isDarkFill,
  relativeLuminance,
  STANDARD_COLORS,
  THEME_COLUMNS,
} from "./excel-palette";

const PALETTE = [
  ...THEME_COLUMNS.flatMap((column) => column.shades),
  ...STANDARD_COLORS.map((color) => color.hex),
];

// Mezcla una capa "rgb(r g b / a)" sobre el relleno y la devuelve como RRGGBB.
function blend(layer: string, fill: string): string {
  const [r, g, b, a] = (layer.match(/[\d.]+/g) ?? []).map(Number);
  return [r, g, b]
    .map((channel, i) => {
      const under = Number.parseInt(fill.slice(i * 2, i * 2 + 2), 16);
      const mixed = Math.round(channel * a + under * (1 - a));
      return mixed.toString(16).padStart(2, "0");
    })
    .join("")
    .toUpperCase();
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort(
    (x, y) => y - x,
  );
  return (hi + 0.05) / (lo + 0.05);
}

describe("contraste de la fila coloreada", () => {
  it.each(PALETTE)("sobre #%s el texto y los íconos se leen", (fill) => {
    const ink = isDarkFill(fill) ? INK_ON_DARK : INK_ON_LIGHT;
    expect(contrast(blend(ink["--foreground"], fill), fill)).toBeGreaterThan(
      4.5,
    );
    expect(
      contrast(blend(ink["--muted-foreground"], fill), fill),
    ).toBeGreaterThan(3);
  });

  // POR QUÉ: «Más colores» admite cualquier color; se recorre una muestra de todo el espectro.
  it("con un color libre también se leen", () => {
    const steps = ["00", "33", "66", "99", "CC", "FF"];
    for (const r of steps)
      for (const g of steps)
        for (const b of steps) {
          const fill = `${r}${g}${b}`;
          const ink = isDarkFill(fill) ? INK_ON_DARK : INK_ON_LIGHT;
          const text = contrast(blend(ink["--foreground"], fill), fill);
          const muted = contrast(blend(ink["--muted-foreground"], fill), fill);
          expect(text, fill).toBeGreaterThan(4.5);
          expect(muted, fill).toBeGreaterThan(3);
        }
  });

  it("el verde del tema lleva tinta oscura y el azul oscuro, clara", () => {
    expect(isDarkFill("70AD47")).toBe(false);
    expect(isDarkFill("203764")).toBe(true);
  });
});
