// src/features/documentation/components/doc-project-form.tsx
// Formulario de la cabecera de un proyecto de documentación: crea el proyecto y abre su detalle, o guarda los
// cambios de uno existente (AGENTS.md §2.10). El mismo zod valida aquí y en la action.
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMarkCreated } from "@/components/forms/fresh-after-create";
import { Button } from "@/components/ui/button";
import { createDocProject } from "../actions/create-doc-project";
import { updateDocProjectHeader } from "../actions/update-doc-project-header";
import {
  type DocProjectInput,
  docProjectSchema,
} from "../schemas/doc-project-schema";
import type { DocProjectFormOptions } from "../types";
import { DocProjectFields } from "./doc-project-fields";

const EMPTY: DocProjectInput = {
  name: "",
  customerId: "",
  contactId: null,
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  technologyIds: [],
  ownerId: "",
};

type Props = {
  options: DocProjectFormOptions;
  // POR QUÉ: sin proyecto es el alta; con proyecto, la edición de su cabecera.
  project?: { id: string; values: DocProjectInput };
};

export function DocProjectForm({ options, project }: Props) {
  const router = useRouter();
  const markCreated = useMarkCreated();
  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const form = useForm<DocProjectInput>({
    resolver: zodResolver(docProjectSchema),
    defaultValues: project?.values ?? EMPTY,
  });
  const { isSubmitting, isDirty } = form.formState;

  async function onSubmit(values: DocProjectInput) {
    setServerError(null);
    setSaved(false);
    if (!project) {
      const result = await createDocProject(values);
      if (!result.ok) return setServerError(result.error.message);
      markCreated();
      return router.push(`/documentacion/${result.data.projectId}`);
    }
    const result = await updateDocProjectHeader({
      ...values,
      projectId: project.id,
    });
    if (!result.ok) return setServerError(result.error.message);
    form.reset(values);
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
      <DocProjectFields
        form={form}
        options={options}
        idPrefix={project ? "doc-edit" : "doc-new"}
      />
      {serverError && (
        <p
          role="alert"
          className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {serverError}
        </p>
      )}
      <div className="flex items-center justify-end gap-3">
        {saved && !isDirty && (
          <output className="text-sm text-muted-foreground">
            Cabecera guardada.
          </output>
        )}
        <Button
          type="submit"
          disabled={isSubmitting || (!!project && !isDirty)}
        >
          {isSubmitting && (
            <LoaderCircle className="animate-spin" aria-hidden="true" />
          )}
          {project ? "Guardar cabecera" : "Crear proyecto"}
        </Button>
      </div>
    </form>
  );
}
