// src/features/tickets/components/historical/historical-rows.test.ts
// Filas de la carga histórica (AGENTS.md §2.6): pegar un bloque desde Excel reconoce catálogos por nombre o código
// y crea las filas que faltan; «Aplicar a todas» respeta «solo a las vacías».
import { describe, expect, it } from "vitest";
import type { TicketFormOptions } from "../../queries/get-ticket-form-options";
import {
  blankHistoricalRow,
  fillHistoricalColumn,
  pasteIntoRows,
} from "./historical-rows";

const options: TicketFormOptions = {
  customers: [{ id: "c1", label: "Banco Andino S.A.", hint: "1000000011" }],
  cities: [{ id: "lp", label: "La Paz", hint: "LP" }],
  areas: [{ id: "a1", label: "DIMAHELP", hint: "Mesa de ayuda" }],
  projects: [],
  engineers: [{ id: "u1", label: "Elena Ingeniera", areaIds: ["a1"] }],
  bags: [],
  filesEnabled: false,
};

describe("pasteIntoRows", () => {
  it("reparte el bloque desde la celda enfocada y reconoce los catálogos", () => {
    const rows = [blankHistoricalRow()];
    const next = pasteIntoRows(
      rows,
      [
        [
          "Banco andino s.a.",
          "lp",
          "dimahelp",
          "",
          "media",
          "Elena Ingeniera",
          "Cerrado",
        ],
        ["1000000011", "La Paz", "Otra área"],
      ],
      { row: 0, col: 4 },
      options,
      { projectId: "p1" },
    );
    expect(next).toHaveLength(2);
    expect(next[0]).toMatchObject({
      key: rows[0].key,
      customerId: "c1",
      cityId: "lp",
      areaIds: ["a1"],
      priority: "MEDIA",
      ownerId: "u1",
      status: "CERRADO",
    });
    expect(next[1]).toMatchObject({
      customerId: "c1",
      cityId: "lp",
      areaIds: [],
      projectId: "p1",
    });
  });

  it("los textos, fechas y horas se pegan recortados", () => {
    const next = pasteIntoRows(
      [],
      [[" T-1 ", "02/11/2026 ", " Correo "]],
      { row: 0, col: 0 },
      options,
      {},
    );
    expect(next[0]).toMatchObject({
      ref: "T-1",
      openedOn: "02/11/2026",
      title: "Correo",
    });
  });
});

describe("fillHistoricalColumn", () => {
  it("aplica a todas o solo a las vacías", () => {
    const rows = [blankHistoricalRow({ cityId: "sc" }), blankHistoricalRow()];
    expect(
      fillHistoricalColumn(rows, "cityId", "lp", true).map((r) => r.cityId),
    ).toEqual(["sc", "lp"]);
    expect(
      fillHistoricalColumn(rows, "cityId", "lp", false).map((r) => r.cityId),
    ).toEqual(["lp", "lp"]);
    expect(
      fillHistoricalColumn(rows, "areaId", "a1", true).map((r) => r.areaIds),
    ).toEqual([["a1"], ["a1"]]);
  });
});
