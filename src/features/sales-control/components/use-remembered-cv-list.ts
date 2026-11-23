// src/features/sales-control/components/use-remembered-cv-list.ts
// Recuerda en la pestaña la búsqueda, los filtros, el orden y la página del listado de CV y los repone al volver
// a /cv sin parámetros (desde un CV o el menú).
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

const STORAGE_KEY = "kraken.cv-list.query";

export function useRememberedCvList() {
  const router = useRouter();
  const query = useSearchParams().toString();

  useEffect(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (query) sessionStorage.setItem(STORAGE_KEY, query);
    else if (saved) router.replace(`/cv?${saved}`);
  }, [query, router]);
}

// TRAMPA: llegar a /cv sin parámetros repone lo guardado; quien deja el listado sin filtros debe guardarlo antes
// de navegar o los filtros vuelven.
export function rememberCvListHref(href: string) {
  const query = href.split("?")[1] ?? "";
  if (query) sessionStorage.setItem(STORAGE_KEY, query);
  else sessionStorage.removeItem(STORAGE_KEY);
}
