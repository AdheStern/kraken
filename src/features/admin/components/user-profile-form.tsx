// src/features/admin/components/user-profile-form.tsx
// Ciudad y cargo de un usuario. La ciudad propone el correlativo y el horario al crear CV y tickets.
"use client";

import { LoaderCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { updateUserProfile } from "../actions/update-user-profile";
import type { CatalogOption, UserAdminDetail } from "../types";
import { LabeledInput } from "./labeled-input";
import { LabeledSelect } from "./labeled-select";
import { useAdminAction } from "./use-admin-action";

type Props = { user: UserAdminDetail; cities: CatalogOption[] };

export function UserProfileForm({ user, cities }: Props) {
  const { isPending, error, run } = useAdminAction();
  const [saved, setSaved] = useState(false);
  const [cityId, setCityId] = useState(user.cityId ?? "");
  const [jobTitle, setJobTitle] = useState(user.jobTitle ?? "");

  return (
    <form
      className="kr-surface grid gap-4 rounded-xl p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
      onSubmit={async (event) => {
        event.preventDefault();
        setSaved(false);
        setSaved(
          await run(() =>
            updateUserProfile({ userId: user.id, cityId, jobTitle }),
          ),
        );
      }}
    >
      <LabeledSelect
        label="Ciudad"
        value={cityId}
        options={cities}
        emptyLabel="Sin ciudad"
        onChange={setCityId}
      />
      <LabeledInput label="Cargo" value={jobTitle} onChange={setJobTitle} />
      <Button type="submit" disabled={isPending}>
        {isPending && (
          <LoaderCircle className="animate-spin" aria-hidden="true" />
        )}
        Guardar
      </Button>
      {(saved || error) && (
        <p
          role={error ? "alert" : "status"}
          className={
            error
              ? "text-sm text-destructive sm:col-span-3"
              : "text-sm text-muted-foreground sm:col-span-3"
          }
        >
          {error ?? "Guardado."}
        </p>
      )}
    </form>
  );
}
