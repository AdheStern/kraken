// src/features/sales-control/components/lines/cv-lines-top-bar.tsx
// Barra fija de las líneas del CV: la del borrador (agregar, factor, guardar y enviar), la de lo que se corrige fuera
// del borrador (datos posventa, GROSS UP y RET DIMA; AGENTS.md §2.3) o solo el título en lectura.
"use client";

import { useRouter } from "next/navigation";
import type { Dispatch, ReactNode } from "react";
import { submitCvVersion } from "../../actions/submit-cv-version";
import type { Option } from "../../types";
import { CvLinesToolbar } from "./cv-lines-toolbar";
import type { LineEditRights } from "./item-cell-context";
import { PostSaleToolbar } from "./post-sale-toolbar";
import type { LinesAction } from "./use-cv-lines-state";

type Props = {
  versionId: string;
  canEdit: boolean;
  rights: LineEditRights;
  columnsMenu: ReactNode;
  technologies: Option[];
  approverLabels: string[];
  isDirty: boolean;
  isSaving: boolean;
  onSave: () => void;
  dispatch: Dispatch<LinesAction>;
  onApplyTechnologyFactor: (technologyId: string, factor: string) => void;
};

export function CvLinesTopBar(props: Props) {
  const { canEdit, rights, columnsMenu, dispatch } = props;
  const router = useRouter();
  const canEditAfterDraft =
    rights.canEditPostSale || rights.canEditWithholdings;

  return (
    // REGLA de la planilla: la barra de líneas queda fija bajo la cabecera de la app al bajar (decisión 2026-11-12);
    // z-20 la deja bajo la cabecera (z-30) y sobre los encabezados de la grilla (z-10).
    <div className="kr-header sticky top-12 z-20 -mx-2 rounded-xl px-2 py-1.5">
      {canEdit ? (
        <CvLinesToolbar
          technologies={props.technologies}
          columnsMenu={columnsMenu}
          isDirty={props.isDirty}
          isSaving={props.isSaving}
          onAddLine={(count) =>
            dispatch({ type: "addLine", groupKey: null, kind: "ITEM", count })
          }
          onAddNote={() =>
            dispatch({ type: "addLine", groupKey: null, kind: "NOTA" })
          }
          onAddGroup={() => dispatch({ type: "addGroup" })}
          onSave={props.onSave}
          approverLabels={props.approverLabels}
          onSubmit={() => submitCvVersion({ versionId: props.versionId })}
          onSubmitted={() => router.refresh()}
          onApplyTechnologyFactor={props.onApplyTechnologyFactor}
        />
      ) : canEditAfterDraft ? (
        <PostSaleToolbar
          rights={rights}
          isDirty={props.isDirty}
          isSaving={props.isSaving}
          onSave={props.onSave}
          columnsMenu={columnsMenu}
        />
      ) : (
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold">Líneas</h2>
          {columnsMenu}
        </div>
      )}
    </div>
  );
}
