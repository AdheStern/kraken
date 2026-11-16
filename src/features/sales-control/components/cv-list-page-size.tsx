// src/features/sales-control/components/cv-list-page-size.tsx
// Selector de filas por página del listado de CV; vive en la URL («filas») y vuelve a la página 1.
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { OptionSelect } from "@/components/ui/option-select";
import {
  CV_PAGE_SIZES,
  DEFAULT_CV_PAGE_SIZE,
  toCvListHref,
} from "../schemas/cv-list-params";

const OPTIONS = CV_PAGE_SIZES.map((n) => ({
  id: String(n),
  label: `${n} por página`,
}));

export function CvListPageSize({ value }: { value: number }) {
  const router = useRouter();
  const params = useSearchParams();

  return (
    <OptionSelect
      value={String(value)}
      options={OPTIONS}
      size="sm"
      onValueChange={(next) =>
        router.replace(
          toCvListHref(params, {
            filas: !next || Number(next) === DEFAULT_CV_PAGE_SIZE ? null : next,
          }),
          { scroll: false },
        )
      }
      className="w-36"
      aria-label="Filas por página"
    />
  );
}
