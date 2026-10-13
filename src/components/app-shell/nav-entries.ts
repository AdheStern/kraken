// src/components/app-shell/nav-entries.ts
// Módulos de la navegación que el servidor habilita por rol.
// TRAMPA: vive fuera de app-nav.tsx ("use client"); un valor exportado desde un módulo de cliente llega al
// servidor como referencia, no como dato.

export type NavKey = "inicio" | "cv" | "horas" | "aprobaciones";

export type NavEntry = { key: NavKey; badge?: number };

export const BASE_NAV: readonly NavEntry[] = [{ key: "inicio" }, { key: "cv" }];
