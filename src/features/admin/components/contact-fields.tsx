// src/features/admin/components/contact-fields.tsx
// Campos de un contacto de cliente (nombre, cargo, correo, teléfono) en una fila editable.
"use client";

import { Input } from "@/components/ui/input";

export type ContactDraft = {
  name: string;
  position: string;
  email: string;
  phone: string;
};

export const EMPTY_CONTACT: ContactDraft = {
  name: "",
  position: "",
  email: "",
  phone: "",
};

const FIELDS: { key: keyof ContactDraft; label: string; type?: string }[] = [
  { key: "name", label: "Nombre" },
  { key: "position", label: "Cargo" },
  { key: "email", label: "Correo", type: "email" },
  { key: "phone", label: "Teléfono" },
];

type Props = {
  draft: ContactDraft;
  onChange: (draft: ContactDraft) => void;
  of: string;
};

export function ContactFields({ draft, onChange, of }: Props) {
  return FIELDS.map((f) => (
    <Input
      key={f.key}
      type={f.type}
      value={draft[f.key]}
      placeholder={f.label}
      aria-label={`${f.label} ${of}`}
      onChange={(e) => onChange({ ...draft, [f.key]: e.target.value })}
      className="h-9"
    />
  ));
}
