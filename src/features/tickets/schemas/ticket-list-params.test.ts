// src/features/tickets/schemas/ticket-list-params.test.ts
// Parámetros de la vista de lista de tickets (AGENTS.md §5): valores inválidos vuelven al de defecto y cambiar un
// filtro vuelve a la página 1.
import { describe, expect, it } from "vitest";
import { parseTicketListParams, toTicketListHref } from "./ticket-list-params";

describe("parseTicketListParams", () => {
  it("sin parámetros es el tablero ordenado por número descendente", () => {
    expect(parseTicketListParams({})).toEqual({
      mode: "tablero",
      search: undefined,
      customerId: undefined,
      areaCode: undefined,
      mine: false,
      status: undefined,
      sort: { key: "numero", direction: "desc" },
      page: 1,
      pageSize: 25,
    });
  });

  it("lee la lista con estado, orden, página y filas, y quita el # de la búsqueda", () => {
    const p = parseTicketListParams({
      modo: "lista",
      q: " #123 ",
      estado: "CERRADO",
      orden: "cliente",
      dir: "asc",
      pagina: "3",
      filas: "50",
      vista: "mios",
    });
    expect(p).toMatchObject({
      mode: "lista",
      search: "123",
      status: "CERRADO",
      sort: { key: "cliente", direction: "asc" },
      page: 3,
      pageSize: 50,
      mine: true,
    });
  });

  it("un valor inválido vuelve al de defecto", () => {
    const p = parseTicketListParams({
      modo: "grilla",
      estado: "ROTO",
      orden: "costo",
      pagina: "-2",
      filas: "7",
      cliente: "no-es-uuid",
    });
    expect(p).toMatchObject({
      mode: "tablero",
      status: undefined,
      sort: { key: "numero", direction: "desc" },
      page: 1,
      pageSize: 25,
      customerId: undefined,
    });
  });
});

describe("toTicketListHref", () => {
  const current = new URLSearchParams("modo=lista&pagina=4&cliente=x");

  it("cambiar un filtro vuelve a la página 1 y conserva el resto", () => {
    expect(toTicketListHref("/tickets", current, { estado: "RESUELTO" })).toBe(
      "/tickets?modo=lista&cliente=x&estado=RESUELTO",
    );
  });

  it("cambiar la página la conserva y un valor vacío quita el parámetro", () => {
    expect(
      toTicketListHref("/tickets/proyectos/p", current, {
        pagina: "5",
        cliente: null,
      }),
    ).toBe("/tickets/proyectos/p?modo=lista&pagina=5");
    expect(toTicketListHref("/tickets", new URLSearchParams(), {})).toBe(
      "/tickets",
    );
  });
});
