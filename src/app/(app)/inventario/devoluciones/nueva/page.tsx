// src/app/(app)/inventario/devoluciones/nueva/page.tsx
// Devolución de una salida, buscada por el número de su comprobante (AGENTS.md §2.8, §7 returnItems). Solo para
// quien opera inventario (§2.9).
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ModuleHeading } from "@/components/app-shell/module-heading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ReturnForm } from "@/features/inventory/components/return-form";
import { getReturnSource } from "@/features/inventory/queries/get-return-source";
import { canOperateInventory } from "@/server/authz/inventory-permissions";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Devolución" };

type Props = PageProps<"/inventario/devoluciones/nueva">;

export default function NewReturnPage({ searchParams }: Props) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-8 sm:px-6">
      <Link
        href="/inventario"
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Inventario
      </Link>
      <ModuleHeading
        title="Devolución"
        description="Lo que vuelve de una salida entra al almacén de origen al costo de esa salida, con sus seriales."
      />
      <Suspense fallback={<Skeleton className="h-72 w-full rounded-xl" />}>
        <ReturnContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function ReturnContent({ searchParams }: Pick<Props, "searchParams">) {
  const [user, params] = await Promise.all([requireUser(), searchParams]);
  if (!canOperateInventory(user)) notFound();
  const asked = typeof params.salida === "string" ? params.salida.trim() : "";
  const number = /^\d{1,9}$/.test(asked) ? Number(asked) : null;
  const source = number ? await getReturnSource(user, number) : null;
  return (
    <>
      <form
        className="flex items-end gap-2"
        action="/inventario/devoluciones/nueva"
      >
        <Label className="grid flex-1 gap-1.5 text-xs font-normal text-muted-foreground">
          N.º de la salida (está en su comprobante)
          <Input
            name="salida"
            inputMode="numeric"
            defaultValue={asked}
            className="h-10 tabular-nums"
            autoFocus={!source}
          />
        </Label>
        <Button type="submit" variant="outline" className="h-10">
          Buscar
        </Button>
      </form>
      {asked && !source && (
        <p role="alert" className="text-sm text-destructive">
          No hay una salida N.º {asked}. Revisa el número del comprobante.
        </p>
      )}
      {source && (
        <>
          <p className="text-sm">
            Salida N.º {source.number} · {source.issuedAt} · {source.warehouse}
            <span className="block text-muted-foreground">
              {source.destination}
            </span>
          </p>
          <ReturnForm key={source.movementId} source={source} />
        </>
      )}
    </>
  );
}
