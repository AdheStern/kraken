// src/domain/sales-control/cv-export-file-name.ts
// Nombre del Excel de un CV: «número - sigla - título.xlsx» (decisión 2026-11-19), como los CV de DIMA en Excel.

// POR QUÉ: Windows no admite estos caracteres en un nombre de archivo y el navegador los cambia a su manera.
const FORBIDDEN = /[\\/:*?"<>|]+/g;
const MAX_LENGTH = 150;

type ExportNameParts = {
  versionLabel: string;
  acronym: string | null;
  customerName: string;
  title: string | null;
};

export function toCvExportFileName(parts: ExportNameParts): string {
  // [CONFIRMAR] sin sigla va la razón social, para no perder al cliente en el nombre.
  const customer = parts.acronym?.trim() || parts.customerName;
  const name = [parts.versionLabel, customer, parts.title]
    .map((part) => clean(part ?? ""))
    .filter((part) => part !== "")
    .join(" - ");
  return `${name.slice(0, MAX_LENGTH).trim()}.xlsx`;
}

function clean(text: string): string {
  return text.replace(FORBIDDEN, " ").replace(/\s+/g, " ").trim();
}
