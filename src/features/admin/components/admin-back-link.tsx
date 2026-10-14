// src/features/admin/components/admin-back-link.tsx
// Vuelta al tablero de la administración desde cualquiera de sus secciones.
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export function AdminBackLink() {
  return (
    <Link
      href="/admin"
      className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      Administración
    </Link>
  );
}
