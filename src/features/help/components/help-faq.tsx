// src/features/help/components/help-faq.tsx
// Preguntas frecuentes de la ayuda como hilo de mensajes; responde la mascota de Kraken.
import Link from "next/link";
import { KrakenMark } from "@/components/brand/kraken-mark";
import { Faq } from "@/components/ui/faq";
import { FAQ } from "../faq";

const ITEMS = FAQ.map((entry) => ({
  id: entry.id,
  question: entry.question,
  answer: (
    <>
      {entry.answer}
      {entry.link && (
        <Link
          href={entry.link.href}
          className="mt-1 block font-medium underline underline-offset-4"
        >
          {entry.link.label}
        </Link>
      )}
    </>
  ),
}));

export function HelpFaq() {
  return (
    <section
      aria-labelledby="faq-title"
      className="kr-surface grid gap-4 rounded-xl p-5 md:grid-cols-[minmax(0,16rem)_minmax(0,1fr)] md:gap-8 md:p-6"
    >
      <header className="flex flex-col gap-1">
        <h2 id="faq-title" className="text-base font-semibold">
          Preguntas frecuentes
        </h2>
        <p className="text-sm text-muted-foreground text-pretty">
          Las dudas que más se repiten sobre horas, CV y tickets. Toca una
          pregunta para ver la respuesta.
        </p>
      </header>
      <Faq
        items={ITEMS}
        avatar={<KrakenMark className="size-6" />}
        className="max-w-2xl"
      />
    </section>
  );
}
