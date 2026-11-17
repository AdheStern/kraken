// src/features/admin/components/admin-search.tsx
// Búsqueda de un listado de la administración por la URL (?q=), sin JavaScript obligatorio; `keep` conserva otros
// parámetros de la URL (la pestaña elegida) al buscar.
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

type Props = {
  action: string;
  defaultValue: string;
  placeholder: string;
  keep?: Record<string, string>;
};

export function AdminSearch({
  action,
  defaultValue,
  placeholder,
  keep = {},
}: Props) {
  return (
    <search className="relative w-full max-w-md">
      <form action={action}>
        {Object.entries(keep).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          name="q"
          type="search"
          defaultValue={defaultValue}
          placeholder={placeholder}
          aria-label={placeholder}
          className="h-9 pl-9"
        />
      </form>
    </search>
  );
}
