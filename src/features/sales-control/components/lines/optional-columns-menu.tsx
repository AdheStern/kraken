// src/features/sales-control/components/lines/optional-columns-menu.tsx
// Botón «Columnas opcionales» de la grilla del CV: marca qué columnas opcionales se ven (BC y PO#).
"use client";

import { Columns3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { COLUMNS, type ColumnKey } from "./grid-columns";
import type { OptionalColumnState } from "./use-optional-columns";

type Props = {
  columns: OptionalColumnState[];
  onToggle: (key: ColumnKey, isOn: boolean) => void;
};

export function OptionalColumnsMenu({ columns, onToggle }: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
        <Columns3 aria-hidden="true" />
        Columnas opcionales
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Mostrar en la tabla</DropdownMenuLabel>
          {columns.map((column) => (
            <DropdownMenuCheckboxItem
              key={column.key}
              checked={column.isChecked || column.hasData}
              disabled={column.hasData}
              onCheckedChange={(isOn) => onToggle(column.key, isOn)}
            >
              {COLUMNS[column.key].label}
              {column.hasData && (
                <span className="text-xs text-muted-foreground">
                  · con datos
                </span>
              )}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
