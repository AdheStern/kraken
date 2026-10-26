// src/app/(app)/inventario/[almacen]/[producto]/page.tsx
// Kardex de un producto en un almacén: saldo, reservado, valor y cada movimiento con su documento de origen
// (AGENTS.md §2.8). Solo para quien ve costos (§2.9); para los demás no existe.
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { KrakenEmpty } from "@/components/brand/kraken-empty";
import { Skeleton } from "@/components/ui/skeleton";
import { formatQuantity } from "@/features/inventory/components/inventory-labels";
import { KardexTable } from "@/features/inventory/components/kardex-table";
import { getKardex } from "@/features/inventory/queries/get-kardex";
import { formatAmount } from "@/lib/format-amount";
import { canOperateInventory } from "@/server/authz/inventory-permissions";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Kardex" };

type Params = PageProps<"/inventario/[almacen]/[producto]">["params"];

export default function KardexPage({ params }: { params: Params }) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-8 sm:px-6">
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
        <Kardex params={params} />
      </Suspense>
    </main>
  );
}

async function Kardex({ params }: { params: Params }) {
  const { almacen, producto } = await params;
  const user = await requireUser();
  const kardex = await getKardex(user, decodeURIComponent(almacen), producto);
  if (!kardex) notFound();
  const { warehouse, product, stock, entries } = kardex;
  return (
    <>
      <Link
        href={`/inventario?almacen=${encodeURIComponent(warehouse.code)}`}
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {warehouse.name}
      </Link>
      <header className="grid gap-1">
        <h1 className="font-mono text-2xl font-semibold tracking-[-0.02em]">
          {product.code}
        </h1>
        <p className="text-sm text-muted-foreground">
          {product.description} · {warehouse.name}
        </p>
      </header>
      <dl className="kr-solid grid grid-cols-2 gap-4 rounded-xl p-4 sm:grid-cols-4">
        <Fact label="En stock" value={formatQuantity(stock.quantity)} />
        <Fact
          label="Reservado"
          value={formatQuantity(stock.reservedQuantity)}
        />
        <Fact
          label="Costo promedio"
          value={
            stock.averageCostUsd
              ? `USD ${formatAmount(stock.averageCostUsd)}`
              : "—"
          }
        />
        <Fact
          label="Valor"
          value={`USD ${formatAmount(stock.valueUsd ?? "0")}`}
        />
      </dl>
      {entries.length > 0 ? (
        <KardexTable entries={entries} canReturn={canOperateInventory(user)} />
      ) : (
        <KrakenEmpty
          compact
          title="Este producto no tuvo movimientos en este almacén."
        >
          El kardex se llena con cada ingreso, salida, traspaso o ajuste.
        </KrakenEmpty>
      )}
    </>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-lg font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
