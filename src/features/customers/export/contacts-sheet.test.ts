// src/features/customers/export/contacts-sheet.test.ts
// Excel del directorio de contactos (decisión 2026-11-06): una fila por puesto, con áreas y responsables legibles.
import { describe, expect, it } from "vitest";
import type { DirectoryContact } from "../types";
import { contactsSheet } from "./contacts-sheet";

const contact: DirectoryContact = {
  id: "c1",
  personId: "p1",
  name: "Rosa Choque",
  position: "Jefa de TI",
  email: "rosa@banco.bo",
  phone: "71234567",
  municipalityId: "m1",
  municipalityLabel: "Yacuiba (Tarija)",
  branchId: null,
  branchName: null,
  areaIds: ["a1", "a2"],
  areaCodes: ["DIMANET", "DIMASOFT"],
  userIds: ["u1"],
  userNames: ["Carlos Comercial"],
  startedOn: "2026-11-06",
  endedOn: null,
  exitReason: null,
  isActive: true,
  customerId: "k1",
  customerName: "Banco Andino",
};

describe("contactsSheet", () => {
  it("escribe una fila legible por puesto", () => {
    expect(contactsSheet([contact]).rows).toEqual([
      {
        name: "Rosa Choque",
        customer: "Banco Andino",
        position: "Jefa de TI",
        email: "rosa@banco.bo",
        phone: "71234567",
        municipality: "Yacuiba (Tarija)",
        branch: null,
        areas: "DIMANET / DIMASOFT",
        users: "Carlos Comercial",
        from: "2026-11-06",
        to: null,
        status: "Activo",
      },
    ]);
  });
});
