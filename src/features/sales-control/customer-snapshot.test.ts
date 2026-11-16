// src/features/sales-control/customer-snapshot.test.ts
// Copia del cliente en la versión (AGENTS.md §2.1, decisión 2026-11-11): la dirección del contacto (la de su
// sucursal o la corregida a mano) reemplaza a la general; sin ella queda la del catálogo. El contacto de soporte y
// licencias va enlazado al del cliente o es otro (decisión 2026-11-16).
import { describe, expect, it } from "vitest";
import {
  isEndContactLinked,
  toCustomerParty,
  toCustomerSnapshot,
} from "./customer-snapshot";

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

const SALES = {
  name: "Sergio Ruiz",
  email: "jsruiz@grupobisa.com",
  phone: "78213303",
  address: "Torre Multicine",
};
const SUPPORT = {
  name: "Alejandra Vargas",
  email: "acvargas@grupobisa.com",
  phone: "2359471-1939",
  address: "Torre Multicine",
};
const RESELLER = { ...CUSTOMER, name: "Mayorista S.R.L.", email: "x@m.bo" };

describe("toCustomerSnapshot", () => {
  it("enlazado y sin otro cliente final deja el cliente final vacío", () => {
    const snapshot = toCustomerSnapshot({
      customer: CUSTOMER,
      endCustomer: null,
      contact: SALES,
      endContact: null,
    });
    expect(snapshot.endCustomer).toBeNull();
    expect(isEndContactLinked(snapshot)).toBe(true);
  });

  it("desenlazado guarda otro contacto del mismo cliente", () => {
    const snapshot = toCustomerSnapshot({
      customer: CUSTOMER,
      endCustomer: null,
      contact: SALES,
      endContact: SUPPORT,
    });
    expect(snapshot.endCustomer).toMatchObject({
      name: CUSTOMER.name,
      contactName: "Alejandra Vargas",
      email: "acvargas@grupobisa.com",
    });
    expect(snapshot.customer.contactName).toBe("Sergio Ruiz");
    expect(isEndContactLinked(snapshot)).toBe(false);
  });

  it("enlazado con otro cliente final le copia el contacto del cliente", () => {
    const snapshot = toCustomerSnapshot({
      customer: CUSTOMER,
      endCustomer: RESELLER,
      contact: SALES,
      endContact: null,
    });
    expect(snapshot.endCustomer).toMatchObject({
      name: "Mayorista S.R.L.",
      contactName: "Sergio Ruiz",
    });
    expect(isEndContactLinked(snapshot)).toBe(true);
  });

  it("una versión sin snapshot cuenta como enlazada", () => {
    expect(isEndContactLinked(null)).toBe(true);
  });
});
