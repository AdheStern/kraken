// src/domain/customers/contact-matching.test.ts
// Aviso de duplicados al crear un contacto (decisión 2026-11-06): correo, teléfono y nombre; una persona una vez.
import { describe, expect, it } from "vitest";
import { findContactMatches, type MatchCandidate } from "./contact-matching";

const candidate = (over: Partial<MatchCandidate>): MatchCandidate => ({
  contactId: "c1",
  personId: "p1",
  name: "José Luis Pérez",
  email: "jlperez@banco.bo",
  phone: "+591 71234567",
  customerId: "banco",
  customerName: "Banco",
  position: "Gerente de TI",
  isActive: true,
  ...over,
});

describe("findContactMatches", () => {
  it("reconoce el mismo correo sin importar mayúsculas", () => {
    const [m] = findContactMatches(
      { name: "Otro", email: "JLPerez@Banco.bo", phone: null },
      [candidate({})],
    );
    expect(m.reasons).toEqual(["CORREO"]);
  });

  it("reconoce el teléfono con o sin 591 y el nombre contenido en el otro", () => {
    const [m] = findContactMatches(
      { name: "jose perez", email: null, phone: "71234567" },
      [candidate({})],
    );
    expect(m.reasons).toEqual(["TELEFONO", "NOMBRE"]);
  });

  it("un solo nombre de pila no basta", () => {
    expect(
      findContactMatches({ name: "José", email: null, phone: null }, [
        candidate({}),
      ]),
    ).toEqual([]);
  });

  it("muestra a cada persona una vez, con su puesto activo", () => {
    const matches = findContactMatches(
      { name: "José Luis Pérez", email: null, phone: null },
      [
        candidate({
          contactId: "viejo",
          isActive: false,
          customerName: "Minera",
        }),
        candidate({ contactId: "actual" }),
      ],
    );
    expect(matches.map((m) => m.contactId)).toEqual(["actual"]);
  });
});
