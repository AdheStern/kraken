// src/features/admin/components/user-roles-panel.tsx
// Roles de un usuario: los asignados (con su área y su origen) y el alta de uno nuevo. El área se pide o se
// oculta según el rol (role-area-rules.ts).
"use client";

import { LoaderCircle, Plus, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { RoleCode } from "@/generated/prisma/enums";
import { grantUserRole } from "../actions/grant-user-role";
import { revokeUserRole } from "../actions/revoke-user-role";
import type { UserAdminDetail, UserAdminOptions } from "../types";
import { LabeledSelect } from "./labeled-select";
import { RoleChip } from "./role-chip";
import { useAdminAction } from "./use-admin-action";

type Props = { user: UserAdminDetail; options: UserAdminOptions };

export function UserRolesPanel({ user, options }: Props) {
  const { isPending, error, run } = useAdminAction();
  const [role, setRole] = useState<RoleCode>(
    options.roles[0]?.code ?? "COMERCIAL",
  );
  const [areaId, setAreaId] = useState("");
  const rule = options.roles.find((r) => r.code === role)?.areaRule ?? "NONE";
  const roleOptions = options.roles.map((r) => ({ id: r.code, label: r.name }));

  return (
    <div className="grid gap-3">
      {user.roles.length > 0 && (
        <ul className="kr-surface divide-y divide-border/60 rounded-xl">
          {user.roles.map((r) => (
            <li
              key={r.id}
              className="flex items-center gap-3 px-4 py-2 text-sm"
            >
              <RoleChip role={r} />
              <span className="flex-1 text-xs text-muted-foreground">
                {r.source === "ENTRA"
                  ? "Desde un grupo de Entra ID"
                  : "Asignado a mano"}
              </span>
              {r.source === "MANUAL" && (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isPending}
                  aria-label={`Quitar ${r.roleName}${r.areaCode ? ` de ${r.areaCode}` : ""}`}
                  onClick={() =>
                    run(() => revokeUserRole({ userRoleId: r.id }))
                  }
                >
                  <X aria-hidden="true" />
                  Quitar
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      <form
        className="kr-surface grid gap-3 rounded-xl p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
        onSubmit={(event) => {
          event.preventDefault();
          run(() =>
            grantUserRole({
              userId: user.id,
              role,
              areaId: rule === "NONE" ? null : areaId,
            }),
          );
        }}
      >
        <LabeledSelect
          label="Rol"
          value={role}
          options={roleOptions}
          onChange={(code) => setRole(code as RoleCode)}
        />
        {rule === "NONE" ? (
          <p className="pb-2 text-sm text-muted-foreground">
            Rige en toda la empresa.
          </p>
        ) : (
          <LabeledSelect
            label={rule === "REQUIRED" ? "Área" : "Área (opcional)"}
            value={areaId}
            options={options.areas}
            emptyLabel={rule === "REQUIRED" ? "Elige el área" : "Sin área"}
            onChange={setAreaId}
          />
        )}
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <LoaderCircle className="animate-spin" aria-hidden="true" />
          ) : (
            <Plus aria-hidden="true" />
          )}
          Asignar rol
        </Button>
      </form>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
