// src/server/inventory/receipt-pdf.test.ts
// Comprobante del POS (AGENTS.md §2.8): se genera, se vuelve a leer, lleva su número y no se rompe con
// caracteres fuera de WinAnsi ni con muchas líneas.
import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { buildReceiptPdf, type ReceiptData } from "./receipt-pdf";

const data: ReceiptData = {
  title: "Salida",
  number: 42,
  issuedAt: "21 oct 2026, 14:12",
  warehouse: "Almacén La Paz",
  destination: "132LP-25 · Banco Andino · «Switch de acceso»",
  documentRef: "PO-77",
  notes: "Entrega en obra − piso 3 🚚",
  actor: "Ana Almacén",
  lines: [
    {
      code: "C9300-48P-E",
      description: "Catalyst 9300",
      quantity: "2",
      serials: ["FOC1", "FOC2"],
    },
  ],
};

describe("buildReceiptPdf", () => {
  it("genera un PDF legible con el número en el título", async () => {
    const bytes = await buildReceiptPdf(data);
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
    const doc = await PDFDocument.load(bytes);
    expect(doc.getTitle()).toBe("Salida N.º 42");
    expect(doc.getPageCount()).toBe(1);
  });

  it("pasa a otra página cuando las líneas no caben", async () => {
    const many = {
      ...data,
      lines: Array.from({ length: 80 }, (_, i) => ({
        ...data.lines[0],
        code: `P-${i}`,
      })),
    };
    const doc = await PDFDocument.load(await buildReceiptPdf(many));
    expect(doc.getPageCount()).toBeGreaterThan(1);
  });
});
