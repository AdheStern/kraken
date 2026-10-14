// src/features/admin/components/admin-back-link.tsx
// Vuelta a la administración (o a la sección de la que se vino) desde una de sus pantallas.
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

type Props = { href?: string; label?: string };

export function AdminBackLink({
  href = "/admin",
  label = "Administración",
}: Props) {
  return (
    <Link
      href={href}
      className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      {label}
    </Link>
  );
}
