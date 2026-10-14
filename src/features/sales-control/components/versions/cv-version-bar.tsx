// src/features/sales-control/components/versions/cv-version-bar.tsx
// Acciones de la versión: elegir versión, abrir una nueva (con motivo), anular, comparar, exportar y duplicar.
// Solo aparecen las acciones que la máquina de estados permite (AGENTS.md §8).
"use client";

import { Ban, FileDown, GitBranchPlus, GitCompareArrows } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  canStartNewVersion,
  nextVersionState,
} from "@/domain/sales-control/version-state-machine";
import { createCvVersion } from "../../actions/create-cv-version";
import { voidCv } from "../../actions/void-cv";
import type { CvEditorData } from "../../types";
import { DuplicateCvButton } from "../duplicate-cv-button";
import { ReasonDialog } from "./reason-dialog";

type Props = {
  editor: CvEditorData;
  canDuplicate: boolean;
};

export function CvVersionBar({ editor, canDuplicate }: Props) {
  const router = useRouter();
  const { header, versions, versionNumber, isLatest, latestStatus, canManage } =
    editor;
  const canOpenVersion = canManage && canStartNewVersion(latestStatus);
  const canVoid =
    canManage && nextVersionState(latestStatus, "ANULAR") !== null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {versions.length > 1 && (
        <select
          aria-label="Versión"
          value={versionNumber}
          onChange={(event) =>
            router.push(`/cv/${header.cvId}?v=${event.target.value}`)
          }
          className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/30 dark:bg-input/30"
        >
          {versions.map((v) => (
            <option key={v.id} value={v.number}>
              v{v.number}
              {v.number === versions[0].number ? " (más reciente)" : ""}
            </option>
          ))}
        </select>
      )}
      {versionNumber > 1 && (
        <Button
          variant="outline"
          size="sm"
          render={
            <Link
              href={`/cv/${header.cvId}/comparar?de=${versionNumber - 1}&a=${versionNumber}`}
            />
          }
          nativeButton={false}
        >
          <GitCompareArrows aria-hidden="true" />
          Comparar con v{versionNumber - 1}
        </Button>
      )}
      {editor.canExport && (
        <a
          href={`/api/cv/${header.versionId}/export.xlsx`}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          <FileDown aria-hidden="true" />
          Excel
        </a>
      )}
      {canOpenVersion && isLatest && (
        <ReasonDialog
          trigger={
            <Button variant="outline" size="sm">
              <GitBranchPlus aria-hidden="true" />
              Nueva versión
            </Button>
          }
          title="Nueva versión"
          description="Se copia la versión vigente a un borrador nuevo. La aprobada sigue vigente hasta que se apruebe la nueva."
          label="Motivo del cambio"
          confirmLabel="Crear versión"
          required
          onConfirm={(reason) => createCvVersion({ cvId: header.cvId, reason })}
          onDone={() => router.push(`/cv/${header.cvId}`)}
        />
      )}
      {canVoid && isLatest && (
        <ReasonDialog
          trigger={
            <Button variant="outline" size="sm" className="text-destructive">
              <Ban aria-hidden="true" />
              Anular
            </Button>
          }
          title={
            latestStatus === "BORRADOR" && versions.length > 1
              ? "Descartar este borrador"
              : "Anular el CV"
          }
          description="El número no se reutiliza. Una versión aprobada solo se anula si no tiene consumos de horas ni despachos."
          label="Motivo de la anulación"
          confirmLabel="Anular"
          required
          destructive
          onConfirm={(reason) => voidCv({ cvId: header.cvId, reason })}
          onDone={() => router.refresh()}
        />
      )}
      {canDuplicate && <DuplicateCvButton cvId={header.cvId} />}
    </div>
  );
}
