// src/features/admin/components/cv-customer-list.tsx
// Resultados de la búsqueda de CV para cambiarles el cliente: número, título, estado y cliente actual, sin montos.
import { KrakenEmpty } from "@/components/brand/kraken-empty";
import type { CustomerChoice, CvCustomerRow } from "../cv-customer-types";
import { ChangeCvCustomerDialog } from "./change-cv-customer-dialog";

type Props = {
  rows: CvCustomerRow[];
  search: string;
  customers: CustomerChoice[];
};

export function CvCustomerList({ rows, search, customers }: Props) {
  if (search === "")
    return (
      <KrakenEmpty compact title="Busca el CV que quieres corregir.">
        Escribe su número (por ejemplo 036LP-26) o parte del nombre del cliente
        actual.
      </KrakenEmpty>
    );
  if (rows.length === 0)
    return (
      <KrakenEmpty
        compact
        mood="curious"
        title={`Ningún CV coincide con «${search}».`}
      >
        Prueba con el número completo del CV o con otra parte del nombre del
        cliente.
      </KrakenEmpty>
    );
  return (
    <ul className="kr-surface divide-y divide-border/60 rounded-xl">
      {rows.map((cv) => (
        <li
          key={cv.id}
          className="grid gap-2 px-4 py-3 text-sm sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
        >
          <div className="grid min-w-0 gap-0.5">
            <p className="truncate">
              <span className="font-medium tabular-nums">{cv.code}</span>
              {cv.versionNumber && cv.versionNumber > 1 && (
                <span className="text-muted-foreground">
                  {" "}
                  v{cv.versionNumber}
                </span>
              )}
              <span className="text-muted-foreground">
                {" "}
                · {cv.isVoided ? "Anulado" : cv.statusLabel}
              </span>
              {cv.title && <span> · {cv.title}</span>}
            </p>
            <p className="truncate text-muted-foreground">
              Cliente: {cv.customer.name}
              {cv.customer.taxId && ` · NIT ${cv.customer.taxId}`}
            </p>
            {cv.usedBagNotice && (
              <p className="text-amber-700 dark:text-amber-400">
                {cv.usedBagNotice}
              </p>
            )}
          </div>
          {!cv.usedBagNotice && (
            <ChangeCvCustomerDialog cv={cv} customers={customers} />
          )}
        </li>
      ))}
    </ul>
  );
}
