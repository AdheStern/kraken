// src/app/(app)/cv/[id]/page.tsx
// Editor de un CV: encabezado con versión y acciones, aprobaciones, cabecera plegable, líneas, leasing e
// historial. `?v=` muestra una versión anterior en solo lectura (AGENTS.md §2.3 y §5, Editor de CV).
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { CvStatusBadge } from "@/features/sales-control/components/cv-status-badge";
import { CvHeaderForm } from "@/features/sales-control/components/header/cv-header-form";
import { CvLeasingEditor } from "@/features/sales-control/components/leasing/cv-leasing-editor";
import { CvLinesEditor } from "@/features/sales-control/components/lines/cv-lines-editor";
import { ApprovalPanel } from "@/features/sales-control/components/versions/approval-panel";
import { CvVersionBar } from "@/features/sales-control/components/versions/cv-version-bar";
import { VersionHistory } from "@/features/sales-control/components/versions/version-history";
import { getCvEditor } from "@/features/sales-control/queries/get-cv-editor";
import { getCvFormOptions } from "@/features/sales-control/queries/get-cv-form-options";
import { getCvGridOptions } from "@/features/sales-control/queries/get-cv-grid-options";
import { getCvLeasing } from "@/features/sales-control/queries/get-cv-leasing";
import { getCvLines } from "@/features/sales-control/queries/get-cv-lines";
import type { CvEditorData } from "@/features/sales-control/types";
import { canCreateCv } from "@/server/authz/cv-permissions";
import { getDecimalParameter } from "@/server/parameters";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Editor de CV" };

// [CONFIRMAR] respaldo si el parámetro no está cargado (AGENTS.md §14, F1).
const FX_DEVIATION_FALLBACK_PCT = "2";
const GG_THRESHOLD_FALLBACK_USD = "50000.00";

export default function CvEditorPage({
  params,
  searchParams,
}: PageProps<"/cv/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-[1720px] flex-col gap-5 px-4 py-6 sm:px-6">
      <Link
        href="/cv"
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Control de Venta
      </Link>
      <Suspense fallback={<EditorSkeleton />}>
        <CvEditor params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function CvEditor({
  params,
  searchParams,
}: Pick<PageProps<"/cv/[id]">, "params" | "searchParams">) {
  const [{ id }, { v }] = await Promise.all([params, searchParams]);
  const user = await requireUser();
  const versionNumber = Number(v);
  const editor = await getCvEditor(
    user,
    id,
    Number.isInteger(versionNumber) ? versionNumber : undefined,
  );
  if (!editor) notFound();
  const { header } = editor;
  const [
    options,
    gridOptions,
    lines,
    leasing,
    maxFxDeviationPct,
    thresholdUsd,
  ] = await Promise.all([
    getCvFormOptions(),
    getCvGridOptions(),
    getCvLines(header.versionId, editor.canSeeCosts),
    getCvLeasing(header.versionId, editor.canSeeCosts),
    getDecimalParameter("fx.desvio_max_pct", FX_DEVIATION_FALLBACK_PCT),
    getDecimalParameter("cv.umbral_gg_usd", GG_THRESHOLD_FALLBACK_USD),
  ]);

  return (
    <>
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h1 className="text-2xl font-semibold tracking-[-0.02em] tabular-nums">
          {header.versionLabel}
        </h1>
        <CvStatusBadge status={header.status} />
        <div className="ml-auto">
          <CvVersionBar
            editor={editor}
            canDuplicate={canCreateCv(user)}
            canExport={editor.canSeeCosts}
          />
        </div>
        <p className="basis-full text-sm text-muted-foreground">
          {header.title} · {header.customerName} · {header.cityName}
        </p>
        {!editor.canEdit && (
          <p className="basis-full text-sm text-muted-foreground">
            Solo lectura: {readOnlyReason(editor)}
          </p>
        )}
      </header>
      <ApprovalPanel approvals={editor.approvals} />
      <CvHeaderForm
        header={header}
        options={options}
        canEdit={editor.canEdit}
        maxFxDeviationPct={maxFxDeviationPct}
        defaultOpen={lines.lines.length === 0}
      />
      <CvLinesEditor
        key={header.revision}
        versionId={header.versionId}
        initial={lines}
        options={gridOptions}
        fxRates={{
          costFxRate: header.costFxRate,
          saleFxRate: header.saleFxRate,
        }}
        thresholdUsd={thresholdUsd}
        canEdit={editor.canEdit}
        canSeeCosts={editor.canSeeCosts}
      />
      {editor.canSeeCosts && (
        <CvLeasingEditor
          // POR QUÉ: guardar leasing no cambia la revisión de la versión; se remonta con los ids guardados.
          key={leasing.map((line) => line.id).join(",")}
          versionId={header.versionId}
          initial={leasing}
          options={gridOptions}
          canEdit={editor.canEdit}
        />
      )}
      <VersionHistory
        cvId={header.cvId}
        versions={editor.versions}
        current={editor.versionNumber}
      />
    </>
  );
}

function readOnlyReason(editor: CvEditorData): string {
  if (!editor.isLatest)
    return "es una versión anterior; abre la más reciente para trabajar.";
  if (editor.header.status === "EN_APROBACION")
    return "la versión está en aprobación y no se puede editar.";
  if (editor.header.status !== "BORRADOR")
    return "la versión ya no está en borrador. Para cambiarla, crea una versión nueva.";
  return "no eres comercial de este CV.";
}

function EditorSkeleton() {
  return (
    <div className="grid gap-4">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-4 w-96" />
      <Skeleton className="h-72 w-full rounded-xl" />
    </div>
  );
}
