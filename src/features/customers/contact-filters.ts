// src/features/customers/contact-filters.ts
// Filtros del directorio de contactos desde la URL (?q=&cliente=&area=&responsable=&todos=1); los comparten la
// pantalla y la exportación a Excel, así el Excel trae exactamente lo que se ve (decisión 2026-11-06).
import { z } from "zod";
import type { ContactFilters } from "./types";

type Params = Record<string, string | string[] | undefined>;

const uuid = z.uuid();

export function toContactFilters(params: Params): ContactFilters {
  const pick = (key: string) => {
    const value = params[key];
    return typeof value === "string" ? value : null;
  };
  const id = (key: string) => {
    const value = pick(key);
    return value && uuid.safeParse(value).success ? value : null;
  };
  return {
    query: (pick("q") ?? "").slice(0, 80),
    customerId: id("cliente"),
    areaId: id("area"),
    userId: pick("responsable"),
    onlyActive: pick("todos") !== "1",
  };
}
