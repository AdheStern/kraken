// src/features/admin/actions/set-parameter.ts
// Cambia un parámetro del sistema (umbral del GG, desvío del TC, avisos de bolsas). Rige desde ese momento,
// sin desplegar (AGENTS.md §0.16, §7 setParameter).
"use server";

import { z } from "zod";
import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import { toActionError } from "@/server/action-errors";
import { prisma } from "@/server/db";
import { guardAdmin } from "../admin-guard";
import {
  isParameterKey,
  PARAMETER_DEFINITIONS,
} from "../parameter-definitions";

const inputSchema = z.object({ key: z.string(), value: z.string() });

export async function setParameter(
  input: z.input<typeof inputSchema>,
): Promise<ActionResult<null>> {
  const { user, denied } = await guardAdmin("system", "los parámetros");
  if (denied) return denied;
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success || !isParameterKey(parsed.data.key))
    return actionError("VALIDATION", "Ese parámetro no se edita desde aquí.");
  const { key } = parsed.data;
  const value = PARAMETER_DEFINITIONS[key].parse.safeParse(parsed.data.value);
  if (!value.success)
    return actionError("VALIDATION", value.error.issues[0].message);
  try {
    const data = { value: value.data, updatedById: user.id };
    await prisma.parameter.upsert({
      where: { key },
      create: { key, ...data, description: PARAMETER_DEFINITIONS[key].label },
      update: data,
    });
    return actionOk(null);
  } catch (error) {
    return toActionError(error, "setParameter");
  }
}
