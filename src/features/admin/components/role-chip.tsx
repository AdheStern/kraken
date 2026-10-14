// src/features/admin/components/role-chip.tsx
// Un rol asignado en pocas letras: nombre del rol y, si lo tiene, el área que lo acota.
import type { UserRoleView } from "../types";

export function RoleChip({ role }: { role: UserRoleView }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs whitespace-nowrap">
      {role.roleName}
      {role.areaCode && (
        <span className="font-medium text-primary">{role.areaCode}</span>
      )}
    </span>
  );
}
