// src/features/sales-control/components/versions/cv-export-menu.tsx
// Botón «Excel» de la versión: descarga el formulario de DIMA y, aparte, con GROSS UP y RET DIMA, que por defecto
// no salen (AGENTS.md §5, decisión 2026-11-25).
"use client";

import { ChevronDown, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Props = { versionId: string };

export function CvExportMenu({ versionId }: Props) {
  const href = `/api/cv/${versionId}/export.xlsx`;
  // POR QUÉ: la respuesta es un adjunto; asignar la URL descarga el archivo sin salir del editor.
  const download = (url: string) => window.location.assign(url);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
        <FileDown aria-hidden="true" />
        Excel
        <ChevronDown aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuItem onClick={() => download(href)}>
          Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => download(`${href}?retenciones=1`)}>
          Excel con GROSS UP y RET DIMA
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
