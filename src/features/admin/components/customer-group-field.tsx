// src/features/admin/components/customer-group-field.tsx
// Grupo empresarial del cliente (empresas hermanas, decisión 2026-11-16): se elige de la lista o se crea al vuelo
// con «Nuevo grupo», que queda elegido.
"use client";

import { LoaderCircle, Plus } from "lucide-react";
import { useRef, useState } from "react";
import { CatalogCombobox } from "@/components/forms/catalog-combobox";
import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { createCustomerGroup } from "../actions/create-customer-group";

type Option = { id: string; label: string };

type Props = {
  value: string | null;
  onChange: (groupId: string | null) => void;
  groups: Option[];
  disabled?: boolean;
};

export function CustomerGroupField({
  value,
  onChange,
  groups,
  disabled,
}: Props) {
  const [created, setCreated] = useState<Option[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const options = [
    ...groups,
    ...created.filter((c) => !groups.some((g) => g.id === c.id)),
  ];

  async function create() {
    setIsPending(true);
    setError(null);
    const result = await createCustomerGroup({ name });
    setIsPending(false);
    if (!result.ok) return setError(result.error.message);
    const { id, name: label } = result.data;
    setCreated((list) => [...list, { id, label }]);
    onChange(id);
    setName("");
    setOpen(false);
  }

  return (
    <FormField
      label="Grupo empresarial"
      htmlFor="customer-group"
      hint="Empresas hermanas: sus contactos se comparten con un clic. No cambia quién ve qué."
      className="sm:col-span-2"
    >
      <div className="flex gap-2">
        <CatalogCombobox
          id="customer-group"
          options={options}
          value={value}
          onChange={onChange}
          disabled={disabled}
          clearable
          placeholder="Sin grupo"
        />
        {!disabled && (
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger
              render={
                <Button type="button" variant="outline" className="shrink-0" />
              }
            >
              <Plus aria-hidden="true" />
              Nuevo grupo
            </PopoverTrigger>
            <PopoverContent
              align="end"
              className="w-72"
              initialFocus={inputRef}
            >
              <div className="grid gap-2">
                <label
                  htmlFor="new-customer-group"
                  className="text-sm font-medium"
                >
                  Nombre del grupo
                </label>
                <Input
                  id="new-customer-group"
                  ref={inputRef}
                  value={name}
                  placeholder="Grupo Bisa"
                  onChange={(event) => setName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter") return;
                    event.preventDefault();
                    void create();
                  }}
                />
                {error && (
                  <p role="alert" className="text-xs text-destructive">
                    {error}
                  </p>
                )}
                <Button
                  type="button"
                  size="sm"
                  disabled={isPending || name.trim().length < 2}
                  onClick={() => void create()}
                >
                  {isPending && (
                    <LoaderCircle className="animate-spin" aria-hidden="true" />
                  )}
                  Crear y elegir
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </FormField>
  );
}
