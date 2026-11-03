// src/features/admin/components/new-customer-account-form.tsx
// Alta de la cuenta del portal de una empresa cliente: cliente, nombre, correo, contraseña y qué puede hacer
// (AGENTS.md §2.11). Una cuenta por empresa, no por persona.
"use client";

import { LoaderCircle } from "lucide-react";
import { useId, useState } from "react";
import {
  CatalogCombobox,
  type CatalogOption,
} from "@/components/forms/catalog-combobox";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { createCustomerAccount } from "../actions/create-customer-account";
import { LabeledInput } from "./labeled-input";
import { type PortalAccess, PortalAccessFields } from "./portal-access-fields";
import { useAdminAction } from "./use-admin-action";

export function NewCustomerAccountForm({
  customers,
}: {
  customers: CatalogOption[];
}) {
  const customerFieldId = useId();
  const { isPending, error, run } = useAdminAction();
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [access, setAccess] = useState<PortalAccess>({
    seesBags: false,
    requestsWork: false,
    comments: false,
  });

  return (
    <form
      className="kr-surface grid gap-4 rounded-xl p-5 sm:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        run(
          () =>
            createCustomerAccount({
              customerId: customerId ?? "",
              name,
              email,
              password,
              ...access,
            }),
          (data) => `/admin/usuarios/${data.id}`,
        );
      }}
    >
      <div className="grid gap-1.5 sm:col-span-2">
        <Label htmlFor={customerFieldId}>Cliente</Label>
        <CatalogCombobox
          id={customerFieldId}
          options={customers}
          value={customerId}
          onChange={(id) => {
            setCustomerId(id);
            const label = customers.find((c) => c.id === id)?.label;
            if (label && !name) setName(label);
          }}
          placeholder="Nombre o NIT"
        />
      </div>
      <LabeledInput
        label="Nombre de la cuenta"
        value={name}
        onChange={setName}
      />
      <LabeledInput
        label="Correo (usuario)"
        type="email"
        autoComplete="off"
        value={email}
        onChange={setEmail}
      />
      <LabeledInput
        label="Contraseña (12 o más caracteres)"
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={setPassword}
        className="sm:col-span-2"
      />
      <PortalAccessFields value={access} onChange={setAccess} />
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <Button type="submit" disabled={isPending}>
          {isPending && (
            <LoaderCircle className="animate-spin" aria-hidden="true" />
          )}
          Crear cuenta
        </Button>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
    </form>
  );
}
