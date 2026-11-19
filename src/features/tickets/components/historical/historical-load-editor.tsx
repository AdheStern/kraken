// src/features/tickets/components/historical/historical-load-editor.tsx
// Carga histórica de trabajo previo: la grilla con «Línea» para sumar filas, «Validar» con la misma función del
// servidor (marca cada celda con error y resume lo que se creará) y «Cargar»; tras cargar quedan solo las filas
// de los tickets que fallaron (AGENTS.md §2.6, decisión 2026-11-19).
"use client";

import { LoaderCircle, Upload } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { AddLinesButton } from "@/components/grid/add-lines-button";
import { Button } from "@/components/ui/button";
import type {
  HistoricalIssue,
  HistoricalRow,
} from "@/domain/tickets/historical-row-parts";
import { parseHistoricalRows } from "@/domain/tickets/parse-historical-rows";
import { formatMinutes } from "@/lib/format-minutes";
import {
  type HistoricalResult,
  importHistoricalTickets,
} from "../../actions/import-historical-tickets";
import type { TicketFormOptions } from "../../queries/get-ticket-form-options";
import { withCell } from "./historical-columns";
import { HistoricalGrid } from "./historical-grid";
import { HistoricalResults } from "./historical-results";
import {
  blankHistoricalRow,
  type DraftRow,
  fillHistoricalColumn,
  pasteIntoRows,
} from "./historical-rows";

const INITIAL_ROWS = 10;
type Props = { options: TicketFormOptions; defaults: Partial<HistoricalRow> };

export function HistoricalLoadEditor({ options, defaults }: Props) {
  const [rows, setRows] = useState(() =>
    Array.from({ length: INITIAL_ROWS }, () => blankHistoricalRow(defaults)),
  );
  const [issues, setIssues] = useState<HistoricalIssue[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const [results, setResults] = useState<HistoricalResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const errors = useMemo(
    () =>
      new Map(
        issues.map((i) => [
          `${i.row}:${i.column === "areaIds" ? "areaId" : i.column}`,
          i.message,
        ]),
      ),
    [issues],
  );
  const plain = () => rows.map(({ key: _key, ...row }) => row);
  const edit = (next: DraftRow[]) => {
    setRows(next);
    setSummary(null);
  };

  function validate(): boolean {
    const { tickets, issues: found } = parseHistoricalRows(plain(), new Date());
    setIssues(found);
    setError(null);
    if (found.length > 0) {
      setSummary(null);
      return false;
    }
    const minutes = tickets
      .flatMap((t) => t.intervals)
      .reduce(
        (sum, i) => sum + (i.end.getTime() - i.start.getTime()) / 60_000,
        0,
      );
    const closed = tickets.filter((t) => t.status === "CERRADO").length;
    setSummary(
      tickets.length === 0
        ? "No hay filas con datos."
        : `Tickets: ${tickets.length} · tiempo real: ${formatMinutes(Math.round(minutes))} · cerrados que descuentan de su bolsa al cargarse: ${closed}.`,
    );
    return tickets.length > 0;
  }

  function submit() {
    if (!validate()) return;
    startTransition(async () => {
      const result = await importHistoricalTickets({ rows: plain() });
      if (!result.ok) return setError(result.error.message);
      if (result.data.issues.length > 0) return setIssues(result.data.issues);
      const failed = new Set(
        result.data.results.flatMap((r) =>
          r.outcome === "ERROR" ? r.rows : [],
        ),
      );
      const kept = rows.filter((_, index) => failed.has(index));
      setResults(result.data.results);
      setSummary(null);
      setRows(kept.length > 0 ? kept : [blankHistoricalRow(defaults)]);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <AddLinesButton
          variant="outline"
          onAdd={(count) =>
            edit([
              ...rows,
              ...Array.from({ length: count }, () =>
                blankHistoricalRow(defaults),
              ),
            ])
          }
        />
        <Button
          size="sm"
          variant="outline"
          onClick={validate}
          disabled={isPending}
        >
          Validar
        </Button>
        <Button size="sm" onClick={submit} disabled={isPending}>
          {isPending ? (
            <LoaderCircle className="animate-spin" aria-hidden="true" />
          ) : (
            <Upload aria-hidden="true" />
          )}
          {isPending ? "Cargando…" : "Cargar"}
        </Button>
        <output className="text-sm text-muted-foreground">
          {issues.length > 0
            ? `${issues.length} ${issues.length === 1 ? "celda con error" : "celdas con error"}: pasa el cursor sobre la celda marcada para ver qué corregir.`
            : summary}
        </output>
      </div>
      {error && (
        <p
          role="alert"
          className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      )}
      {results && <HistoricalResults results={results} />}
      <HistoricalGrid
        rows={rows}
        options={options}
        errors={errors}
        onCell={(index, key, value) =>
          edit(rows.map((r, i) => (i === index ? withCell(r, key, value) : r)))
        }
        onRemove={(index) => edit(rows.filter((_, i) => i !== index))}
        onFill={(key, value, onlyEmpty) =>
          edit(fillHistoricalColumn(rows, key, value, onlyEmpty))
        }
        onPasteBlock={(target, matrix) =>
          edit(pasteIntoRows(rows, matrix, target, options, defaults))
        }
      />
    </div>
  );
}
