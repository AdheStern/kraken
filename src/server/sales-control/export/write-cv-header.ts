// src/server/sales-control/export/write-cv-header.ts
// Cabecera de la hoja "CONTROL DE VENTAS V2": identificación, personas, cliente, cliente final y orden
// del cliente en las celdas fijas de la plantilla (AGENTS.md §5, Exportación a Excel).
import type { Worksheet } from "exceljs";
import type { CvExportData, CvExportParty } from "./cv-export-data";

const DATE_FORMAT = "dd/mm/yyyy";
const PARTY_FIELDS: (keyof CvExportParty)[] = [
  "name",
  "taxId",
  "contact",
  "email",
  "phone",
  "address",
  "cityCountry",
];

export function writeCvHeader(ws: Worksheet, data: CvExportData): void {
  const put = (address: string, value: string | Date | null) => {
    const cell = ws.getCell(address);
    cell.value = value === "" ? null : value;
    if (value instanceof Date) cell.numFmt = DATE_FORMAT;
  };
  put("C5", data.versionLabel);
  put("D5", data.title);
  put("J5", data.serviceType);
  put("J6", data.mainTechnology);
  put("J7", data.isNewTechnology ? "SI" : "NO");
  put("C6", data.issuedOn);
  put("C7", data.sellers.join(" / "));
  put("C8", data.presales);
  put("C9", data.areas.join(" / "));
  PARTY_FIELDS.forEach((field, index) => {
    put(`C${10 + index}`, data.customer[field]);
    put(`I${11 + index}`, data.endCustomer[field]);
  });
  put("C17", data.customerPoNumber);
  put("C18", data.customerPoDate);
  put("C19", data.paymentTerms);
  put("C20", data.deliveryOn);
  put("C21", data.notes);
}
