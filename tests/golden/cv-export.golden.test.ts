// tests/golden/cv-export.golden.test.ts
// Golden de la exportación a Excel: escribe un CV de prueba sobre la plantilla PA-PR-03-RE-01 y compara la
// hoja celda por celda (valores y fórmulas) contra el snapshot (AGENTS.md §5 y §11). Usa las líneas de PRECIO-01.
// El formato es el del CV 085LP-26 de DIMA más BC; GROSS UP y RET DIMA solo si se piden (decisión 2026-11-25).
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
  grossUpUsd: "",
  retDimaUsd: "",
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
  endCustomer: {
    ...party,
    name: "Cliente Final S.R.L.",
    contact: "Alejandra Vargas",
  },
  customerPoNumber: "OC-4521",
  customerPoDate: new Date("2026-10-10T00:00:00Z"),
  paymentTerms: "50% a la firma, 50% contra entrega",
  isForeignPayment: true,
  deliveryOn: null,
  notes: "Entrega en dos fases",
  costFxRate: "6.97",
  saleFxRate: "6.96",
  finalPrice: null,
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
          grossUpUsd: "74.15",
          retDimaUsd: "593.18",
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
    sheet: workbook.getWorksheet("CONTROL DE VENTAS") as ExcelJS.Worksheet,
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

function fillOf(sheet: ExcelJS.Worksheet, address: string) {
  const value = sheet.getCell(address).fill;
  return value?.type === "pattern" ? value.fgColor?.argb : undefined;
}

describe("exportación del CV a PA-PR-03-RE-01", async () => {
  const { sheet } = await readSheet(await exportCvToXlsx(DATA));
  const cells = cellMap(sheet);
  const fill = (address: string) => fillOf(sheet, address);

  it("coincide celda por celda con el golden", () => {
    expect(cells).toMatchSnapshot();
  });

  it("cabecera en las celdas del formulario de DIMA", () => {
    expect(cells.C5).toBe("210LP-26 v2");
    expect(cells.D5).toBe("Renovación de red");
    expect(cells.J6).toBe("Cisco");
    expect(cells.C7).toBe("Ana Comercial / Bruno Comercial");
    expect(cells.C9).toBe("DIMANET / DIMATEL");
    expect(cells.I11).toBe("Cliente Final S.R.L.");
    // REGLA: el contacto de soporte y licencias puede ser otro que el del cliente (decisión 2026-11-16).
    expect(cells.I13).toBe("Alejandra Vargas");
    expect(cells.C12).not.toBe("Alejandra Vargas");
    expect(cells.C18).toBe("2026-10-10");
    expect(sheet.getCell("C18").numFmt).toBe("dd/mm/yyyy");
  });

  it("L1 a L3 son el código, la fecha y la revisión del formulario, no del CV", () => {
    expect(cells.L1?.trim()).toBe("Código: PA-PR-03-RE-01");
    expect(cells.L2).toBe("Fecha: 04/04/2021");
    expect(cells.L3).toBe("Revisión: 0");
  });

  it("columnas del formulario más BC, sin GROSS UP ni RET DIMA", () => {
    const headers = "ABCDEFGHIJKLMNOP".split("").map((c) => cells[`${c}23`]);
    expect(headers).toEqual([
      "ITEM ",
      "PROVEEDOR",
      "LINEA DEL PRODUCTO",
      "BC",
      "CODIGO",
      "DESCRIPCION ",
      "CANT",
      "Prec. Unit. Comp. $us.",
      "Prec. Tot. Comp. $us.",
      "Prec. Unit. Venta $us.",
      "Prec. Tot. Venta $us.",
      "TC",
      "Prec. Unit. Venta Bs.",
      "Prec. Tot. Venta Bs.",
      "OBS /  TECNICOS",
      "PO#",
    ]);
    expect(Object.values(cells)).not.toContain("GROSS UP");
    expect(sheet.pageSetup.printArea).toBe("A1:P41");
  });

  it("líneas con fórmulas redondeadas; subítem 1.1; lote con subtotal; nota sin importe", () => {
    expect(cells.D24).toBe("BC-ADM");
    expect(cells.J24).toBe("985.76");
    expect(cells.P24).toBe("PO-1");
    expect(cells.I24).toBe("=ROUND(H24*G24,2)");
    expect(cells.K24).toBe("=ROUND(J24*G24,2)");
    expect(cells.M24).toBe("=ROUND(J24*L24,2)");
    expect(cells.N24).toBe("=ROUND(K24*L24,2)");
    expect(cells.F27).toBe("Initial Term - 36 Months");
    expect(cells.A27).toBeUndefined();
    expect(cells.F28).toBe("LOTE 1");
    expect(cells.I28).toBe("=SUM(I29:I30)");
    expect(cells.N28).toBe("=SUM(N29:N30)");
    expect(cells.A25).toBe("1.1");
    expect(cells.A26).toBe("2");
    expect(cells.A30).toBe("4");
  });

  it("totales solo de ítems, factor global sobre líneas con costo y Bs por línea", () => {
    expect(cells.I31).toBe('=SUMIF(A24:A30,"<>",I24:I30)');
    expect(cells.N31).toBe('=SUMIF(A24:A30,"<>",N24:N30)');
    expect(cells.P31).toContain('SUMIFS(K24:K30,A24:A30,"<>",I24:I30,">0")');
    expect(cells.O31).toBe("FACTOR:");
    expect(cells.I32).toBe('=SUMPRODUCT((A24:A30<>"")*ROUND(I24:I30*6.97,2))');
    expect(cells.K32).toBe("=N31");
  });

  it("fila 22: línea principal y totales; el proveedor solo si es uno", () => {
    expect(cells.C22).toBe("Cisco");
    expect(cells.B22).toBeUndefined();
    expect(cells.I22).toBe("=I31");
    expect(cells.K22).toBe("=K31");
  });

  it("bloque de leasing desplazado con una fila extra y su total", () => {
    expect(cells.C33).toBe(
      "SOLO PARA CASOS DE SERVICIOS DE LEASING O ARRENDAMIENTO:",
    );
    expect(cells.F37).toBe("UPS 3 kVA");
    expect(cells.J37).toBe("36 meses");
    expect(cells.F40).toBe("Switch de acceso");
    expect(cells.D37).toBeUndefined();
    expect(cells.I41).toBe("=SUM(I37:I40)");
  });

  it("las filas con color llevan su relleno de A a P; las demás conservan el de la plantilla", () => {
    expect(fill("A24")).toBe("FFFFC000");
    expect(fill("P24")).toBe("FFFFC000");
    expect(fill("Q24")).not.toBe("FFFFC000");
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

  it("ninguna nota lleva un fragmento de texto vacío (Excel pide reparar el archivo)", () => {
    const emptyRuns: string[] = [];
    sheet.eachRow({ includeEmpty: true }, (row) => {
      row.eachCell({ includeEmpty: true }, (cell) => {
        const note = cell.note;
        if (typeof note !== "object") return;
        if (note.texts?.some((run) => run.text === ""))
          emptyRuns.push(cell.address);
      });
    });
    expect(emptyRuns).toEqual([]);
  });
});

describe("con GROSS UP y RET DIMA (decisión 2026-11-25)", async () => {
  const { sheet } = await readSheet(
    await exportCvToXlsx(DATA, { withWithholdings: true }),
  );
  const cells = cellMap(sheet);
  const fill = (address: string) => fillOf(sheet, address);

  it("coincide celda por celda con el golden", () => {
    expect(cells).toMatchSnapshot();
  });

  it("van en J y K tras el costo total, con la cabecera en amarillo, y el resto se corre dos columnas", () => {
    expect(cells.J23).toBe("GROSS UP");
    expect(cells.K23).toBe("RET DIMA");
    expect(fill("J23")).toBe("FFFFFF00");
    expect(fill("K23")).toBe("FFFFFF00");
    expect(fill("I23")).not.toBe("FFFFFF00");
    expect(cells.L23).toBe("Prec. Unit. Venta $us.");
    expect(cells.R23).toBe("PO#");
    expect(cells.J24).toBe("74.15");
    expect(cells.K24).toBe("593.18");
    expect(cells.J25).toBeUndefined();
    expect(cells.M24).toBe("=ROUND(L24*G24,2)");
    expect(cells.P24).toBe("=ROUND(M24*N24,2)");
    expect(cells.R24).toBe("PO-1");
  });

  it("subtotales, totales, fila 22, leasing y área de impresión siguen a las columnas", () => {
    expect(cells.J28).toBe("=SUM(J29:J30)");
    expect(cells.J31).toBe('=SUMIF(A24:A30,"<>",J24:J30)');
    expect(cells.K31).toBe('=SUMIF(A24:A30,"<>",K24:K30)');
    expect(cells.Q31).toBe("FACTOR:");
    expect(cells.R31).toContain("IFERROR(ROUND(SUMIFS(M24:M30");
    expect(cells.M22).toBe("=M31");
    expect(cells.L37).toBe("36 meses");
    expect(sheet.pageSetup.printArea).toBe("A1:R41");
  });

  it("la franja del título se ensancha con la tabla; la cabecera del cliente no se mueve", () => {
    expect(cells.N1?.trim()).toBe("Código: PA-PR-03-RE-01");
    expect(sheet.getCell("M1").isMerged).toBe(true);
    expect(cells.I11).toBe("Cliente Final S.R.L.");
    expect(cells.J6).toBe("Cisco");
  });
});

describe("precio final bajo los totales (decisión 2026-11-19)", async () => {
  const withUsd = cellMap(
    (
      await readSheet(
        await exportCvToXlsx({
          ...DATA,
          finalPrice: { saleUsd: "2500.00", saleBs: null },
        }),
      )
    ).sheet,
  );

  it("valor en USD, Bs del TC de venta, ajuste y K22 al precio final", () => {
    expect(withUsd.H33).toBe("PRECIO FINAL $us:");
    expect(withUsd.K33).toBe("2500");
    expect(withUsd.N33).toBe("=ROUND(K33*6.96,2)");
    expect(withUsd.H34).toBe("AJUSTE:");
    expect(withUsd.K34).toBe("=K33-K31");
    expect(withUsd.N34).toBe("=N33-N31");
    expect(withUsd.I33).toBeUndefined();
    expect(withUsd.J33).toBeUndefined();
    expect(withUsd.K22).toBe("=K33");
    expect(withUsd.I22).toBe("=I31");
  });

  it("el leasing baja las dos filas del precio final", () => {
    expect(withUsd.C35).toBe(
      "SOLO PARA CASOS DE SERVICIOS DE LEASING O ARRENDAMIENTO:",
    );
    expect(withUsd.I43).toBe("=SUM(I39:I42)");
  });

  it("con solo Bs el USD es el calculado", async () => {
    const onlyBs = cellMap(
      (
        await readSheet(
          await exportCvToXlsx({
            ...DATA,
            finalPrice: { saleUsd: null, saleBs: "17000.00" },
          }),
        )
      ).sheet,
    );
    expect(onlyBs.K33).toBe("=K31");
    expect(onlyBs.N33).toBe("17000");
  });
});
