// src/features/admin/components/product-form.tsx
// Ficha de un producto: código, descripción, tecnología, unidad, tipo y si lleva serial (AGENTS.md §2.1, §2.8).
"use client";

import { LoaderCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { upsertProduct } from "../actions/upsert-product";
import type { ItemTypeCode, ProductDetail, ProductFormOptions } from "../types";
import { LabeledInput } from "./labeled-input";
import { LabeledSelect } from "./labeled-select";
import { ITEM_TYPE_LABELS } from "./product-labels";
import { useAdminAction } from "./use-admin-action";

const ITEM_TYPE_OPTIONS = Object.entries(ITEM_TYPE_LABELS).map(
  ([id, label]) => ({ id, label }),
);

type Props = { product?: ProductDetail; options: ProductFormOptions };

export function ProductForm({ product, options }: Props) {
  const { isPending, error, run } = useAdminAction();
  const [saved, setSaved] = useState(false);
  const [draft, setDraft] = useState({
    code: product?.code ?? "",
    description: product?.description ?? "",
    technologyId: product?.technologyId ?? "",
    unitId: product?.unitId ?? "",
    itemType: product?.itemType ?? ("HARDWARE" as ItemTypeCode),
    isSerialized: product?.isSerialized ?? false,
  });
  const set = (patch: Partial<typeof draft>) =>
    setDraft({ ...draft, ...patch });

  async function save() {
    setSaved(false);
    const input = { id: product?.id ?? null, ...draft };
    if (!product)
      return run(
        () => upsertProduct(input),
        (data) => `/admin/productos/${data.id}`,
      );
    setSaved(await run(() => upsertProduct(input)));
  }

  return (
    <form
      className="kr-surface grid gap-4 rounded-xl p-5 sm:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
    >
      <LabeledInput
        label="Código"
        value={draft.code}
        onChange={(code) => set({ code })}
      />
      <LabeledSelect
        label="Tipo"
        value={draft.itemType}
        options={ITEM_TYPE_OPTIONS}
        onChange={(itemType) => set({ itemType: itemType as ItemTypeCode })}
      />
      <LabeledInput
        label="Descripción"
        value={draft.description}
        onChange={(description) => set({ description })}
        className="sm:col-span-2"
      />
      <LabeledSelect
        label="Tecnología"
        value={draft.technologyId}
        options={options.technologies}
        emptyLabel="Sin tecnología"
        onChange={(technologyId) => set({ technologyId })}
      />
      <LabeledSelect
        label="Unidad"
        value={draft.unitId}
        options={options.units}
        emptyLabel="Sin unidad"
        onChange={(unitId) => set({ unitId })}
      />
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <Checkbox
          checked={draft.isSerialized}
          onCheckedChange={(isSerialized) => set({ isSerialized })}
        />
        Lleva número de serie (el inventario lo pide en cada ingreso y salida)
      </label>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <Button type="submit" disabled={isPending}>
          {isPending && (
            <LoaderCircle className="animate-spin" aria-hidden="true" />
          )}
          {product ? "Guardar cambios" : "Crear producto"}
        </Button>
        {saved && !error && (
          <p role="status" className="text-sm text-muted-foreground">
            Guardado. Las líneas de CV ya guardadas conservan su código y
            descripción.
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
    </form>
  );
}
