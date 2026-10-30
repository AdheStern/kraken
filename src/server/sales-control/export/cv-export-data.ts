// src/server/sales-control/export/cv-export-data.ts
// Datos de una versión de CV listos para escribir en la plantilla PA-PR-03-RE-01 (ADR-12).
// Montos como texto decimal exacto; el escritor los convierte a número de Excel solo al escribir la celda.

export type CvExportParty = {
  name: string;
  taxId: string;
  contact: string;
  email: string;
  phone: string;
  address: string;
  cityCountry: string;
};

export type CvExportItem = {
  kind: "ITEM";
  supplier: string;
  technology: string;
  code: string;
  description: string;
  quantity: string;
  unitCostUsd: string;
  unitSaleUsd: string;
  observations: string;
  poNumber: string;
  /** Relleno de la fila como RRGGBB; null = el de la plantilla. */
  color: string | null;
};

export type CvExportNote = { kind: "NOTA"; text: string; color: string | null };

/** Una sección por lote, en el orden del editor: primero las líneas sin lote (`groupName: null`). */
export type CvExportSection = {
  groupName: string | null;
  rows: (CvExportItem | CvExportNote)[];
};

export type CvExportLeasingLine = {
  supplier: string;
  technology: string;
  code: string;
  description: string;
  quantity: string;
  unitCostUsd: string;
  notes: string;
  poNumber: string;
};

export type CvExportData = {
  versionLabel: string;
  title: string;
  issuedOn: Date;
  sellers: string[];
  presales: string;
  areas: string[];
  serviceType: string;
  mainTechnology: string;
  isNewTechnology: boolean;
  customer: CvExportParty;
  endCustomer: CvExportParty;
  customerPoNumber: string;
  customerPoDate: Date | null;
  paymentTerms: string;
  deliveryOn: Date | null;
  notes: string;
  costFxRate: string;
  saleFxRate: string;
  sections: CvExportSection[];
  leasing: CvExportLeasingLine[];
};
