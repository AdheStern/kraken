// src/app/(app)/cv/[id]/page.tsx
// Editor de un CV: encabezado con código y estado, cabecera plegable y líneas (AGENTS.md §5, Editor de CV).
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { CvStatusBadge } from "@/features/sales-control/components/cv-status-badge";
import { CvHeaderForm } from "@/features/sales-control/components/header/cv-header-form";
import { getCvEditor } from "@/features/sales-control/queries/get-cv-editor";
import { getCvFormOptions } from "@/features/sales-control/queries/get-cv-form-options";
import { getDecimalParameter } from "@/server/parameters";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Editor de CV" };

// [CONFIRMAR] respaldo si el parámetro no está cargado (AGENTS.md §14, F1).
const FX_DEVIATION_FALLBACK_PCT = "2";

export default function CvEditorPage({ params }: PageProps<"/cv/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-6 sm:px-6">
      <Link
        href="/cv"
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Control de Venta
      </Link>
      <Suspense fallback={<EditorSkeleton />}>
        <CvEditor params={params} />
      </Suspense>
    </main>
  );
}

async function CvEditor({ params }: Pick<PageProps<"/cv/[id]">, "params">) {
  const { id } = await params;
  const user = await requireUser();
  const [editor, options, maxFxDeviationPct] = await Promise.all([
    getCvEditor(user, id),
    getCvFormOptions(),
    getDecimalParameter("fx.desvio_max_pct", FX_DEVIATION_FALLBACK_PCT),
  ]);
  if (!editor) notFound();
  const { header } = editor;

  return (
    <>
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h1 className="text-2xl font-semibold tracking-[-0.02em] tabular-nums">
          {header.versionLabel}
        </h1>
        <CvStatusBadge status={header.status} />
        <p className="basis-full text-sm text-muted-foreground">
          {header.title} · {header.customerName} · {header.cityName}
        </p>
        {!editor.canEdit && (
          <p className="basis-full text-sm text-muted-foreground">
            Solo lectura:{" "}
            {header.status === "BORRADOR"
              ? "no eres comercial de este CV."
              : "la versión ya no está en borrador."}
          </p>
        )}
      </header>
      <CvHeaderForm
        header={header}
        options={options}
        canEdit={editor.canEdit}
        maxFxDeviationPct={maxFxDeviationPct}
      />
    </>
  );
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
