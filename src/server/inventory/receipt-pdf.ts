// src/server/inventory/receipt-pdf.ts
// Comprobante PDF de una salida o devolución del POS (AGENTS.md §2.8, §7): número, fecha, almacén, destino,
// líneas con seriales, quién lo registró y firmas. Sin costos: el comprobante viaja con la mercadería (regla 12).
import {
  PDFDocument,
  type PDFFont,
  type PDFPage,
  rgb,
  StandardFonts,
} from "pdf-lib";

export type ReceiptData = {
  title: string;
  number: number;
  issuedAt: string;
  warehouse: string;
  destination: string;
  documentRef: string | null;
  notes: string | null;
  actor: string;
  lines: {
    code: string;
    description: string;
    quantity: string;
    serials: string[];
  }[];
};

const A4: [number, number] = [595.28, 841.89];
const MARGIN = 48;
const INK = rgb(0.13, 0.15, 0.22);
const MUTED = rgb(0.42, 0.45, 0.52);

type Writer = {
  page: PDFPage;
  y: number;
  doc: PDFDocument;
  regular: PDFFont;
  bold: PDFFont;
};

export async function buildReceiptPdf(data: ReceiptData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`${data.title} N.º ${data.number}`);
  doc.setCreator("Kraken by DIMA");
  const w: Writer = {
    doc,
    page: doc.addPage(A4),
    y: A4[1] - MARGIN,
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
  };
  text(w, `${data.title} N.º ${data.number}`, { size: 18, font: w.bold });
  text(w, `Kraken by DIMA · ${data.issuedAt}`, { color: MUTED });
  w.y -= 12;
  for (const [label, value] of [
    ["Almacén", data.warehouse],
    ["Destino", data.destination],
    ["Documento", data.documentRef],
    ["Notas", data.notes],
    ["Registró", data.actor],
  ] as const)
    if (value) text(w, `${label}: ${value}`);
  w.y -= 12;
  text(w, "Cant.    Código / descripción", { font: w.bold, color: MUTED });
  for (const line of data.lines) {
    text(w, `${line.quantity.padEnd(8)} ${line.code} · ${line.description}`);
    if (line.serials.length > 0)
      text(w, `         Seriales: ${line.serials.join(", ")}`, {
        color: MUTED,
      });
  }
  w.y -= 48;
  signatures(w);
  return doc.save();
}

function text(
  w: Writer,
  value: string,
  options: {
    size?: number;
    font?: PDFFont;
    color?: ReturnType<typeof rgb>;
  } = {},
) {
  const size = options.size ?? 10;
  const font = options.font ?? w.regular;
  for (const row of wrap(toWinAnsi(value), font, size, A4[0] - MARGIN * 2)) {
    if (w.y < MARGIN + size) {
      w.page = w.doc.addPage(A4);
      w.y = A4[1] - MARGIN;
    }
    w.page.drawText(row, {
      x: MARGIN,
      y: w.y - size,
      size,
      font,
      color: options.color ?? INK,
    });
    w.y -= size * 1.5;
  }
}

function signatures(w: Writer) {
  const half = (A4[0] - MARGIN * 2) / 2;
  if (w.y < MARGIN + 24) {
    w.page = w.doc.addPage(A4);
    w.y = A4[1] - MARGIN - 48;
  }
  for (const [index, label] of ["Entrega (Almacén)", "Recibe"].entries()) {
    const x = MARGIN + index * half;
    w.page.drawLine({
      start: { x, y: w.y },
      end: { x: x + half - 24, y: w.y },
      thickness: 0.6,
      color: MUTED,
    });
    w.page.drawText(label, {
      x,
      y: w.y - 14,
      size: 9,
      font: w.regular,
      color: MUTED,
    });
  }
}

function wrap(
  value: string,
  font: PDFFont,
  size: number,
  width: number,
): string[] {
  const rows: string[] = [];
  let row = "";
  for (const word of value.split(" ")) {
    const candidate = row ? `${row} ${word}` : word;
    if (row && font.widthOfTextAtSize(candidate, size) > width) {
      rows.push(row);
      row = word;
    } else row = candidate;
  }
  return [...rows, row];
}

// TRAMPA: las fuentes estándar del PDF usan WinAnsi; un carácter fuera de ella (p. ej. "−" o un emoji) rompe el
// documento. Se reemplaza por su equivalente o por "?".
function toWinAnsi(value: string): string {
  return value.replace(/[−‐-‒]/g, "-").replace(/[^ -~ -ÿ–—‘’“”•…€]/g, "?");
}
