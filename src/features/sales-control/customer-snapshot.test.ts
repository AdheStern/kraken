// src/features/sales-control/customer-snapshot.test.ts
// Copia del cliente en la versión (AGENTS.md §2.1, decisión 2026-11-11): la dirección del contacto (la de su
// sucursal o la corregida a mano) reemplaza a la general; sin ella queda la del catálogo.
import { describe, expect, it } from "vitest";
import { toCustomerParty } from "./customer-snapshot";

const CUSTOMER = {
  name: "Minera Illimani S.A.",
  taxId: "1020304050",
  email: "info@illimani.bo",
  phone: "2222222",
  address: "Av. Arce 2000",
  city: "La Paz",
  country: "Bolivia",
};

describe("toCustomerParty", () => {
  it("usa la dirección del contacto cuando la hay", () => {
    expect(
      toCustomerParty(CUSTOMER, { name: "Ana", address: "Calle 5, El Alto" }),
    ).toMatchObject({ contactName: "Ana", address: "Calle 5, El Alto" });
  });

  it("sin dirección del contacto deja la general del cliente", () => {
    expect(toCustomerParty(CUSTOMER, { address: "" }).address).toBe(
      "Av. Arce 2000",
    );
    expect(toCustomerParty(CUSTOMER).address).toBe("Av. Arce 2000");
  });
});
