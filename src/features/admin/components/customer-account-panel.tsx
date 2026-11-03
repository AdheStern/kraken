// src/features/admin/components/customer-account-panel.tsx
// Ficha de la cuenta de un cliente: su empresa, qué puede hacer en el portal y cambio de contraseña (§2.11).
"use client";

import { LoaderCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { updateCustomerAccount } from "../actions/update-customer-account";
import type { CustomerAccountView } from "../types";
import { LabeledInput } from "./labeled-input";
import { type PortalAccess, PortalAccessFields } from "./portal-access-fields";
import { useAdminAction } from "./use-admin-action";

export function CustomerAccountPanel({
  userId,
  account,
}: {
  userId: string;
  account: CustomerAccountView;
}) {
  const { isPending, error, run } = useAdminAction();
  const [saved, setSaved] = useState(false);
  const [password, setPassword] = useState("");
  const [access, setAccess] = useState<PortalAccess>(account);

  async function save() {
    setSaved(false);
    const ok = await run(() =>
      updateCustomerAccount({ userId, password, ...access }),
    );
    if (ok) setPassword("");
    setSaved(ok);
  }

  return (
    <form
      className="kr-surface grid gap-4 rounded-xl p-5 sm:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
    >
      <p className="text-sm sm:col-span-2">
        Cuenta del portal de{" "}
        <span className="font-medium">{account.customerName}</span>. Ve solo
        Inicio y los tickets de su empresa.
      </p>
      <PortalAccessFields value={access} onChange={setAccess} />
      <LabeledInput
        label="Contraseña nueva (vacía = no cambiar)"
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={setPassword}
        className="sm:col-span-2"
      />
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <Button type="submit" disabled={isPending}>
          {isPending && (
            <LoaderCircle className="animate-spin" aria-hidden="true" />
          )}
          Guardar cambios
        </Button>
        {saved && !error && (
          <output className="text-sm text-muted-foreground">
            Guardado. Si cambiaste la contraseña, sus sesiones abiertas se
            cerraron.
          </output>
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
