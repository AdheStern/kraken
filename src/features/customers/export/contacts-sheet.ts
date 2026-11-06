// src/features/customers/export/contacts-sheet.ts
// Hoja de Excel del directorio de contactos (decisión 2026-11-06): una fila por puesto, con su cliente, datos,
// ubicación, áreas, responsables de DIMA, fechas y estado.
import type { SheetSpec } from "@/server/dashboards/sheets-to-xlsx";
import type { DirectoryContact } from "../types";

export function contactsSheet(
  contacts: readonly DirectoryContact[],
): SheetSpec {
  return {
    name: "Contactos",
    columns: [
      { header: "Nombre", key: "name", width: 28 },
      { header: "Cliente", key: "customer", width: 32 },
      { header: "Cargo", key: "position", width: 24 },
      { header: "Correo", key: "email", width: 30 },
      { header: "Teléfono", key: "phone", width: 16 },
      { header: "Municipio", key: "municipality", width: 30 },
      { header: "Sucursal", key: "branch", width: 22 },
      { header: "Áreas", key: "areas", width: 22 },
      { header: "Lo atienden", key: "users", width: 32 },
      { header: "Desde", key: "from", width: 12 },
      { header: "Hasta", key: "to", width: 12 },
      { header: "Estado", key: "status", width: 12 },
    ],
    rows: contacts.map((c) => ({
      name: c.name,
      customer: c.customerName,
      position: c.position,
      email: c.email,
      phone: c.phone,
      municipality: c.municipalityLabel,
      branch: c.branchName,
      areas: c.areaCodes.join(" / ") || null,
      users: c.userNames.join(", ") || null,
      from: c.startedOn,
      to: c.endedOn,
      status: c.isActive ? "Activo" : "Anterior",
    })),
  };
}
