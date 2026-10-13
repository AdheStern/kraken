// src/features/notifications/schemas/mark-inbox-read-schema.ts
// Entrada de markInboxRead: unos avisos concretos o todos los no leídos.
import { z } from "zod";

export const markInboxReadSchema = z.union([
  z.object({ ids: z.array(z.uuid()).min(1).max(100) }),
  z.object({ all: z.literal(true) }),
]);

export type MarkInboxReadInput = z.infer<typeof markInboxReadSchema>;
