// src/features/inventory/components/count-lines.tsx
// Lo contado: por producto la cantidad (se escribe; cada lectura suma una) o los seriales leídos, con su botón
// para quitarlos. Objetivos de 48 px para usar en tablet (AGENTS.md §5 POS y conteo).
"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type CountLine = {
  code: string;
  description: string;
  isSerialized: boolean;
  quantity: string;
  serials: string[];
  // POR QUÉ: un sobrante sin stock en el almacén no tiene promedio; entra al costo que se indique (§2.8).
  inStock: boolean;
  unitCostUsd: string;
};

type Props = { lines: CountLine[]; onChange: (lines: CountLine[]) => void };

export function CountLines({ lines, onChange }: Props) {
  const replace = (line: CountLine, next: CountLine | null) =>
    onChange(
      next
        ? lines.map((l) => (l === line ? next : l))
        : lines.filter((l) => l !== line),
    );
  return (
    <ul className="kr-solid divide-y divide-border/60 rounded-xl">
      {lines.map((line) => (
        <li key={line.code} className="grid gap-2 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-mono text-sm font-medium">{line.code}</p>
              <p className="truncate text-sm text-muted-foreground">
                {line.description || "Producto agregado por código"}
              </p>
            </div>
            {line.isSerialized ? (
              <span className="text-3xl font-semibold tabular-nums">
                {line.serials.length}
              </span>
            ) : (
              <Input
                value={line.quantity}
                inputMode="decimal"
                aria-label={`Cantidad contada de ${line.code}`}
                className="h-12 w-28 text-right text-lg tabular-nums"
                onChange={(e) =>
                  replace(line, { ...line, quantity: e.target.value })
                }
              />
            )}
            {!line.inStock && (
              <Input
                value={line.unitCostUsd}
                inputMode="decimal"
                placeholder="Costo USD"
                aria-label={`Costo unitario USD de ${line.code}`}
                className="h-12 w-28 text-right"
                onChange={(e) =>
                  replace(line, { ...line, unitCostUsd: e.target.value })
                }
              />
            )}
            <Button
              variant="ghost"
              size="icon"
              className="size-12"
              aria-label={`Quitar ${line.code}`}
              onClick={() => replace(line, null)}
            >
              <X aria-hidden="true" />
            </Button>
          </div>
          {line.serials.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {line.serials.map((serial) => (
                <li key={serial}>
                  <Button
                    variant="outline"
                    className="h-12 font-mono"
                    aria-label={`Quitar el serial ${serial}`}
                    onClick={() =>
                      replace(line, {
                        ...line,
                        serials: line.serials.filter((s) => s !== serial),
                      })
                    }
                  >
                    {serial}
                    <X aria-hidden="true" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  );
}
