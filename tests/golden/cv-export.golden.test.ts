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
  isSubItem: false,
  supplier: "INGRAM",
  technology: "Cisco",
  bc: "",
  code: "",
  description: "",
  quantity: "1",
  unitCostUsd: "0.00",
  unitSaleUsd: "0.00",
  observations: "",
  poNumber: "",
  color: null,
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
          bc: "BC-ADM",
          color: "FFC000",
        }),
        item({
          supplier: "DIMA",
          technology: "Webex",
          description: "Licencias Webex",
          isSubItem: true,
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
        { kind: "NOTA", text: "Initial Term - 36 Months", color: "DDEBF7" },
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
    expect(cells.E5).toBe("Renovación de red");
    expect(cells.J11).toBe("Cliente Final S.R.L.");
    expect(cells.C18).toBe("2026-10-10");
  });

  it("líneas con fórmulas redondeadas; subítem 1.1; lote con subtotal; nota sin importe", () => {
    expect(cells.D23).toBe("BC");
    expect(cells.D24).toBe("BC-ADM");
    expect(cells.P24).toBe("PO-1");
    expect(cells.I24).toBe("=ROUND(H24*G24,2)");
    expect(cells.N24).toBe("=ROUND(K24*L24,2)");
    expect(cells.F27).toBe("Initial Term - 36 Months");
    expect(cells.A27).toBeUndefined();
    expect(cells.F28).toBe("LOTE 1");
    expect(cells.I28).toBe("=SUM(I29:I30)");
    expect(cells.A25).toBe("1.1");
    expect(cells.A26).toBe("2");
    expect(cells.A30).toBe("4");
  });

  it("totales solo de ítems, factor global sobre líneas con costo y Bs por línea", () => {
    expect(cells.I31).toBe('=SUMIF(A24:A30,"<>",I24:I30)');
    expect(cells.P31).toContain('SUMIFS(K24:K30,A24:A30,"<>",I24:I30,">0")');
    expect(cells.I32).toBe('=SUMPRODUCT((A24:A30<>"")*ROUND(I24:I30*6.97,2))');
    expect(cells.I22).toBe("=I31");
    expect(cells.K22).toBe("=K31");
  });

  it("bloque de leasing desplazado con una fila extra y su total", () => {
    expect(cells.C33).toBe(
      "SOLO PARA CASOS DE SERVICIOS DE LEASING O ARRENDAMIENTO:",
    );
    expect(cells.F37).toBe("UPS 3 kVA");
    expect(cells.F40).toBe("Switch de acceso");
    expect(cells.D37).toBeUndefined();
    expect(cells.I41).toBe("=SUM(I37:I40)");
  });

  it("las filas con color llevan su relleno de A a P; las demás conservan el de la plantilla", () => {
    const fill = (address: string) => {
      const value = sheet.getCell(address).fill;
      return value?.type === "pattern" ? value.fgColor?.argb : undefined;
    };
    expect(fill("A24")).toBe("FFFFC000");
    expect(fill("P24")).toBe("FFFFC000");
    expect(fill("Q24")).toBeUndefined();
    // TRAMPA: las filas copiadas de la 24 no deben heredar el color (estilo compartido de duplicateRow).
    expect(fill("A25")).not.toBe("FFFFC000");
    expect(fill("F27")).toBe("FFDDEBF7");
  });

  it("conserva el logo y las notas de ayuda, que se desplazan con su encabezado", () => {
    expect(sheet.getImages()).toHaveLength(1);
    expect(sheet.getCell("E23").note).toBeDefined();
    expect(sheet.getCell("E36").note).toBeDefined();
    expect(sheet.getCell("E30").note).toBeUndefined();
    expect(sheet.getCell("D23").note).toBeUndefined();
  });
});
