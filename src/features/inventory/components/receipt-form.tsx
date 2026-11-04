// src/features/inventory/components/receipt-form.tsx
// Ingreso a un almacén: almacén, origen, PO# y notas; las líneas se cargan tocando mosaicos del catálogo o se
// pegan desde Excel, y el panel muestra las tarjetas, los errores en vivo y el total (AGENTS.md §2.8). La
// validación es la misma del servidor (parseReceiptRows).
"use client";

import Decimal from "decimal.js";
import { useState } from "react";
import { useMarkCreated } from "@/components/forms/fresh-after-create";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  parseReceiptRows,
  type ReceiptDraftRow,
} from "@/domain/inventory/parse-receipt-rows";
import { roundHalfUp2 } from "@/domain/pricing/money";
import { formatAmount } from "@/lib/format-amount";
import { registerReceipt } from "../actions/register-receipt";
import type { ReceiptProduct } from "../types";
import { formatQuantity } from "./inventory-labels";
import { PosWorkspace } from "./pos-workspace";
import { ReceiptDone } from "./receipt-done";
import {
  EMPTY_ROW,
  removeReceiptRow,
  sameCode,
  upsertReceiptRow,
} from "./receipt-draft";
import {
  type ReceiptHeader,
  ReceiptHeaderFields,
} from "./receipt-header-fields";
import {
  ReceiptItemDialog,
  type ReceiptItemDraft,
} from "./receipt-item-dialog";
import { ReceiptLinesPanel } from "./receipt-lines-panel";
import { ReceiptProducts } from "./receipt-products";
import { ReceiptRowsEditor } from "./receipt-rows-editor";

type Warehouse = { id: string; code: string; name: string };
type Props = {
  warehouses: Warehouse[];
  defaultWarehouseId: string;
  products: ReceiptProduct[];
};

const freshRows = () => [EMPTY_ROW, EMPTY_ROW, EMPTY_ROW];

export function ReceiptForm({
  warehouses,
  defaultWarehouseId,
  products,
}: Props) {
  const [header, setHeader] = useState<ReceiptHeader>({
    warehouseId: defaultWarehouseId,
    origin: "COMPRA_LOCAL",
    documentRef: "",
    notes: "",
  });
  const [rows, setRows] = useState(freshRows);
  const [idempotencyKey, setIdempotencyKey] = useState(() =>
    crypto.randomUUID(),
  );
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const markCreated = useMarkCreated();
  const [done, setDone] = useState<{
    number: number;
    createdProducts: string[];
  } | null>(null);
  const [editing, setEditing] = useState<{
    draft: ReceiptItemDraft;
    code: string;
  } | null>(null);
  const { lines, issues } = parseReceiptRows(rows);
  const units = lines.reduce((sum, l) => sum.plus(l.quantity), new Decimal(0));
  const total = lines.reduce(
    (sum, l) => sum.plus(roundHalfUp2(l.unitCostUsd.mul(l.quantity))),
    new Decimal(0),
  );
  const warehouse = warehouses.find((w) => w.id === header.warehouseId);

  async function submit() {
    setIsPending(true);
    setError(null);
    const result = await registerReceipt({ ...header, idempotencyKey, rows });
    setIsPending(false);
    if (!result.ok) return setError(result.error.message);
    markCreated();
    setDone(result.data);
  }

  function restart() {
    setRows(freshRows());
    setHeader((h) => ({ ...h, documentRef: "", notes: "" }));
    setIdempotencyKey(crypto.randomUUID());
    setDone(null);
  }

  function edit(row: ReceiptDraftRow) {
    const product = products.find((p) => sameCode(row, p.code));
    setEditing({
      draft: {
        row,
        isNew: !product,
        isSerialized: product?.isSerialized ?? false,
      },
      code: row.code,
    });
  }

  if (done && warehouse)
    return <ReceiptDone {...done} warehouse={warehouse} onRestart={restart} />;
  const totals = `${lines.length} ${lines.length === 1 ? "línea" : "líneas"} · ${formatQuantity(units.toFixed(2))} unidades · USD ${formatAmount(total.toFixed(2))}`;
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <PosWorkspace
        title="Ingreso"
        summary={lines.length === 1 ? "1 línea" : `${lines.length} líneas`}
        products={
          <>
            <ReceiptHeaderFields
              warehouses={warehouses}
              value={header}
              onChange={(patch) => setHeader((h) => ({ ...h, ...patch }))}
            />
            <Tabs defaultValue="productos" className="gap-4">
              <TabsList className="h-12!">
                <TabsTrigger value="productos" className="px-4">
                  Productos
                </TabsTrigger>
                <TabsTrigger value="excel" className="px-4">
                  Pegar desde Excel
                </TabsTrigger>
              </TabsList>
              <TabsContent value="productos">
                <ReceiptProducts
                  products={products}
                  rows={rows}
                  onOpen={(draft) =>
                    setEditing({ draft, code: draft.row.code })
                  }
                />
              </TabsContent>
              <TabsContent value="excel">
                <ReceiptRowsEditor
                  rows={rows}
                  issueRows={new Set(issues.map((i) => i.row))}
                  onChange={setRows}
                />
              </TabsContent>
            </Tabs>
            <ReceiptItemDialog
              draft={editing?.draft ?? null}
              onClose={() => setEditing(null)}
              onSave={(row) => {
                // POR QUÉ: en un producto nuevo el código se puede corregir; la fila vieja no debe quedar.
                const base = editing?.code
                  ? removeReceiptRow(rows, editing.code)
                  : rows;
                setRows(upsertReceiptRow(base, row));
                setEditing(null);
              }}
            />
          </>
        }
        panel={
          <ReceiptLinesPanel
            rows={rows}
            issues={issues}
            totals={totals}
            isPending={isPending}
            error={error}
            onEdit={edit}
            onRemove={(code) => setRows(removeReceiptRow(rows, code))}
          />
        }
      />
    </form>
  );
}
