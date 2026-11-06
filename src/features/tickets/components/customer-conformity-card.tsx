// src/features/tickets/components/customer-conformity-card.tsx
// En el portal, con el ticket resuelto: «¿Quedaste conforme?». Conforme con 1 a 5 estrellas; si no, el motivo,
// que vuelve a abrir el trabajo (§2.11, decisión 2026-11-05).
"use client";

import { LoaderCircle, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { answerTicketConformity } from "../actions/answer-ticket-conformity";
import type { ConformityInput } from "../schemas/conformity-schema";

const STARS = [1, 2, 3, 4, 5];

export function CustomerConformityCard({ ticketId }: { ticketId: string }) {
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [isUnhappy, setIsUnhappy] = useState(false);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function send(input: ConformityInput) {
    setIsPending(true);
    setError(null);
    const result = await answerTicketConformity(input);
    setIsPending(false);
    if (!result.ok) return setError(result.error.message);
    router.refresh();
  }

  return (
    <section
      aria-labelledby="conformidad"
      className="kr-solid grid gap-4 rounded-xl border-primary/40 p-5"
    >
      <div>
        <h2 id="conformidad" className="font-medium">
          ¿Quedaste conforme con la solución?
        </h2>
        <p className="text-sm text-muted-foreground">
          Tu respuesta llega al encargado. Si algo falta, cuéntanos y seguimos
          trabajando.
        </p>
      </div>
      {!isUnhappy ? (
        <div className="flex flex-wrap items-center gap-3">
          <fieldset className="flex gap-1">
            <legend className="sr-only">Calificación de 1 a 5</legend>
            {STARS.map((n) => (
              <Button
                key={n}
                type="button"
                variant="ghost"
                size="icon"
                aria-pressed={rating === n}
                aria-label={`${n} de 5`}
                onClick={() => setRating(n)}
              >
                <Star
                  aria-hidden="true"
                  className={
                    n <= rating
                      ? "fill-amber-400 text-amber-400"
                      : "text-muted-foreground"
                  }
                />
              </Button>
            ))}
          </fieldset>
          <Button
            disabled={rating === 0 || isPending}
            onClick={() => send({ ticketId, isSatisfied: true, rating })}
          >
            {isPending && (
              <LoaderCircle className="animate-spin" aria-hidden="true" />
            )}
            Estoy conforme
          </Button>
          <Button variant="outline" onClick={() => setIsUnhappy(true)}>
            No quedé conforme
          </Button>
        </div>
      ) : (
        <div className="grid gap-3">
          <Label className="grid gap-1.5 text-[13px] font-normal text-muted-foreground">
            ¿Qué falta?
            <Textarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              autoFocus
            />
          </Label>
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={comment.trim() === "" || isPending}
              onClick={() => send({ ticketId, isSatisfied: false, comment })}
            >
              {isPending && (
                <LoaderCircle className="animate-spin" aria-hidden="true" />
              )}
              Enviar y reabrir
            </Button>
            <Button variant="ghost" onClick={() => setIsUnhappy(false)}>
              Volver
            </Button>
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}
