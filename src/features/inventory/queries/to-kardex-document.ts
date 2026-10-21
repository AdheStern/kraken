// src/features/inventory/queries/to-kardex-document.ts
// Documento de origen de un movimiento para el kardex (AGENTS.md §2.8): CV, ticket, traspaso, ajuste o la
// referencia escrita (PO#), en ese orden.
import { toCvVersionLabel } from "@/domain/sales-control/cv-code";
import type { KardexDocument } from "../types";

type Source = {
  documentRef: string | null;
  adjustmentRequestId: string | null;
  cvLine: {
    version: { number: number; cv: { id: string; code: string } };
  } | null;
  ticket: { id: string; number: number } | null;
  transfer: { number: number } | null;
};

export function toKardexDocument(source: Source): KardexDocument | null {
  if (source.cvLine) {
    const { cv, number } = source.cvLine.version;
    return {
      kind: "CV",
      label: toCvVersionLabel(cv.code, number),
      href: `/cv/${cv.id}`,
    };
  }
  if (source.ticket)
    return {
      kind: "TICKET",
      label: `Ticket #${source.ticket.number}`,
      href: `/tickets/${source.ticket.id}`,
    };
  if (source.transfer)
    return { kind: "TRASPASO", label: `Traspaso #${source.transfer.number}` };
  if (source.adjustmentRequestId)
    return { kind: "AJUSTE", label: "Ajuste aprobado" };
  return source.documentRef
    ? { kind: "DOCUMENTO", label: source.documentRef }
    : null;
}
