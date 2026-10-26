// src/features/admin/components/admin-section-card.tsx
// Tarjeta de una sección de la administración: ícono, qué se gestiona ahí y cuántos registros activos tiene.
import {
  ArrowLeftRight,
  Building2,
  CalendarDays,
  Cpu,
  FolderTree,
  KeyRound,
  Layers,
  type LucideIcon,
  Mail,
  MapPin,
  Package,
  Ruler,
  ScrollText,
  SlidersHorizontal,
  Timer,
  Truck,
  Users,
  Warehouse,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import type { AdminSection, AdminSectionKey } from "../admin-sections";

const ICONS: Record<AdminSectionKey, LucideIcon> = {
  clientes: Building2,
  proveedores: Truck,
  productos: Package,
  areas: Layers,
  ciudades: MapPin,
  almacenes: Warehouse,
  calendario: CalendarDays,
  sla: Timer,
  tecnologias: Cpu,
  unidades: Ruler,
  "tipos-servicio": Wrench,
  "fases-documentacion": FolderTree,
  usuarios: Users,
  "grupos-entra": KeyRound,
  parametros: SlidersHorizontal,
  "tipo-cambio": ArrowLeftRight,
  correo: Mail,
  auditoria: ScrollText,
};

type Props = { section: AdminSection; count?: number };

export function AdminSectionCard({ section, count }: Props) {
  const Icon = ICONS[section.key];
  return (
    <li className="kr-surface kr-lift relative flex gap-4 rounded-xl p-4">
      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <Link
            href={section.href}
            className="font-medium after:absolute after:inset-0 hover:underline"
          >
            {section.title}
          </Link>
          {count !== undefined && (
            <span className="text-sm tabular-nums text-muted-foreground">
              {count}
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{section.description}</p>
      </div>
    </li>
  );
}
