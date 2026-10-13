// tests/golden/cv-export.golden.test.ts
// Golden de la exportación a Excel: escribe un CV de prueba sobre la plantilla PA-PR-03-RE-01 y compara la
// hoja celda por celda (valores y fórmulas) contra el snapshot (AGENTS.md §5 y §11). Usa las líneas de PRECIO-01.
import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import type {
  CvExportData,
  CvExportItem,
} from "@/server/sales-control/export/cv-export-data";
import { exportCvToXlsx } from "@/server/sales-control/export/excel-cv-exporter";

const party = {
  name: "Cliente de Prueba S.A.",
  taxId: "1020304050",
  contact: "Persona de Contacto",
  email: "compras@cliente.test",
  phone: "70000000",
  address: "Av. Siempre Viva 123",
  cityCountry: "La Paz - Bolivia",
};

const item = (overrides: Partial<CvExportItem>): CvExportItem => ({
  kind: "ITEM",
  supplier: "INGRAM",
  technology: "Cisco",
  code: "",
  description: "",
  quantity: "1",
  unitCostUsd: "0.00",
  unitSaleUsd: "0.00",
  observations: "",
  poNumber: "",
  ...overrides,
});

const DATA: CvExportData = {
  versionLabel: "210LP-26 v2",
  title: "Renovación de red",
  issuedOn: new Date("2026-10-13T00:00:00Z"),
  sellers: ["Ana Comercial", "Bruno Comercial"],
  presales: "Carla Preventa",
  areas: ["DIMANET", "DIMATEL"],
  serviceType: "Implementación",
  mainTechnology: "Cisco",
  isNewTechnology: false,
  customer: party,
  endCustomer: { ...party, name: "Cliente Final S.R.L." },
  customerPoNumber: "OC-4521",
  customerPoDate: new Date("2026-10-10T00:00:00Z"),
  paymentTerms: "50% a la firma, 50% contra entrega",
  deliveryOn: null,
  notes: "Entrega en dos fases",
  costFxRate: "6.97",
  saleFxRate: "6.96",
  sections: [
    {
      groupName: null,
      rows: [
        item({
          code: "C9300-48P",
          description: "Switch Catalyst 9300",
          unitCostUsd: "337.59",
          unitSaleUsd: "985.76",
          observations: "S/N: FOC1, FOC2",
          poNumber: "PO-1",
        }),
        item({
          supplier: "DIMA",
          technology: "Webex",
          description: "Licencias Webex",
          unitCostUsd: "45.22",
          unitSaleUsd: "130.80",
        }),
        item({
          supplier: "DIMA",
          technology: "Servicios",
          description: "Servicios conexos",
          unitCostUsd: "0.00",
          unitSaleUsd: "269.12",
        }),
        { kind: "NOTA", text: "Initial Term - 36 Months" },
      ],
    },
    {
      groupName: "LOTE 1",
      rows: [
        item({
          code: "FG-100F",
          description: "FortiGate 100F",
          quantity: "2",
          unitCostUsd: "1200.50",
          unitSaleUsd: "1800.75",
        }),
        item({
          code: "FC-10",
          description: "Soporte FortiCare 1 año",
          quantity: "2.5",
          unitCostUsd: "100.10",
          unitSaleUsd: "150.15",
        }),
      ],
    },
  ],
  leasing: ["UPS 3 kVA", "Rack 42U", "PDU", "Switch de acceso"].map(
    (description, index) => ({
      supplier: "Arrendadora",
      technology: "Infraestructura",
      code: `LS-${index + 1}`,
      description,
      quantity: "1",
      unitCostUsd: "250.00",
      notes: index === 0 ? "36 meses" : "",
      poNumber: "",
    }),
  ),
};

async function readSheet(buffer: Buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  return {
    sheet: workbook.getWorksheet("CONTROL DE VENTAS V2") as ExcelJS.Worksheet,
  };
}

function cellMap(sheet: ExcelJS.Worksheet): Record<string, string> {
  const cells: Record<string, string> = {};
  sheet.eachRow({ includeEmpty: false }, (row) => {
    row.eachCell({ includeEmpty: false }, (cell) => {
      const value = cell.value;
      if (value === null || value === "") return;
      if (value instanceof Date)
        cells[cell.address] = value.toISOString().slice(0, 10);
      else if (typeof value === "object" && "formula" in value)
        cells[cell.address] = `=${value.formula}`;
      else if (typeof value === "object" && "richText" in value)
        cells[cell.address] = value.richText.map((t) => t.text).join("");
      else cells[cell.address] = String(value);
    });
  });
  return cells;
}

describe("exportación del CV a PA-PR-03-RE-01", async () => {
  const { sheet } = await readSheet(await exportCvToXlsx(DATA));
  const cells = cellMap(sheet);

  it("coincide celda por celda con el golden", () => {
    expect(cells).toMatchSnapshot();
  });

  it("cabecera en las celdas de la plantilla", () => {
    expect(cells.C5).toBe("210LP-26 v2");
    expect(cells.C7).toBe("Ana Comercial / Bruno Comercial");
    expect(cells.C9).toBe("DIMANET / DIMATEL");
    expect(cells.I11).toBe("Cliente Final S.R.L.");
    expect(cells.C18).toBe("2026-10-10");
  });

  it("líneas con fórmulas redondeadas; lote con subtotal; nota sin importe", () => {
    expect(cells.H24).toBe("=ROUND(G24*F24,2)");
    expect(cells.M24).toBe("=ROUND(J24*K24,2)");
    expect(cells.E27).toBe("Initial Term - 36 Months");
    expect(cells.A27).toBeUndefined();
    expect(cells.E28).toBe("LOTE 1");
    expect(cells.H28).toBe("=SUM(H29:H30)");
    expect(cells.A30).toBe("5");
  });

  it("totales solo de ítems, factor global sobre líneas con costo y Bs por línea", () => {
    expect(cells.H31).toBe('=SUMIF(A24:A30,">0",H24:H30)');
    expect(cells.O31).toContain('SUMIFS(J24:J30,A24:A30,">0",H24:H30,">0")');
    expect(cells.H32).toBe("=SUMPRODUCT((A24:A30>0)*ROUND(H24:H30*6.97,2))");
    expect(cells.H22).toBe("=H31");
  });

  it("bloque de leasing desplazado con una fila extra y su total", () => {
    expect(cells.C33).toBe(
      "SOLO PARA CASOS DE SERVICIOS DE LEASING O ARRENDAMIENTO:",
    );
    expect(cells.E37).toBe("UPS 3 kVA");
    expect(cells.E40).toBe("Switch de acceso");
    expect(cells.H41).toBe("=SUM(H37:H40)");
  });

  it("conserva el logo y las notas de ayuda, que se desplazan con su encabezado", () => {
    expect(sheet.getImages()).toHaveLength(1);
    expect(sheet.getCell("D23").note).toBeDefined();
    expect(sheet.getCell("D36").note).toBeDefined();
    expect(sheet.getCell("D30").note).toBeUndefined();
  });
});
