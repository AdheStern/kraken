// src/components/ui/faq.tsx
// Preguntas frecuentes como hilo de mensajes: cada pregunta es un globo y su respuesta llega como réplica
// (adaptado de rare-ui faq con los tokens de la marca). Flechas, Inicio y Fin mueven el foco entre preguntas.
"use client";

import {
  AnimatePresence,
  motion,
  type Transition,
  useReducedMotion,
} from "motion/react";
import {
  Fragment,
  type KeyboardEvent,
  type ReactNode,
  useId,
  useState,
} from "react";
import { cn } from "@/lib/utils";

const SEND: Transition = { type: "spring", visualDuration: 0.42, bounce: 0.28 };
const SHIFT: Transition = { type: "spring", visualDuration: 0.4, bounce: 0.1 };
const LEAVE: Transition = { duration: 0.16, ease: [0.4, 0, 1, 1] };
const INSTANT: Transition = { duration: 0 };

const QUESTION = '[data-slot="faq-question"]';
const KEY_STEPS: Record<string, (index: number, last: number) => number> = {
  ArrowDown: (index) => index + 1,
  ArrowUp: (index) => index - 1,
  Home: () => 0,
  End: (_, last) => last,
};

export type FaqItem = { id: string; question: string; answer: ReactNode };

type Props = {
  items: readonly FaqItem[];
  avatar?: ReactNode;
  className?: string;
};

export function Faq({ items, avatar, className }: Props) {
  const reduced = useReducedMotion() ?? false;
  const uid = useId();
  const [openId, setOpenId] = useState<string | null>(null);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step = KEY_STEPS[event.key];
    const target = event.target as HTMLElement;
    if (!step || !target.matches(QUESTION)) return;
    const questions = [
      ...event.currentTarget.querySelectorAll<HTMLElement>(QUESTION),
    ];
    const next = step(questions.indexOf(target), questions.length - 1);
    event.preventDefault();
    questions[(next + questions.length) % questions.length]?.focus();
  }

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: solo reparte el foco entre los botones de pregunta.
    <div
      data-slot="faq"
      onKeyDown={onKeyDown}
      className={cn("flex w-full flex-col gap-3", className)}
    >
      {items.map((item) => {
        const open = openId === item.id;
        const questionId = `${uid}-${item.id}-q`;
        const answerId = `${uid}-${item.id}-a`;
        return (
          <Fragment key={item.id}>
            {/* POR QUÉ: cada globo vuelve a medirse cuando se abre cualquier respuesta, para que los de abajo se deslicen. */}
            <motion.button
              layout="position"
              layoutDependency={openId}
              id={questionId}
              type="button"
              data-slot="faq-question"
              aria-expanded={open}
              aria-controls={open ? answerId : undefined}
              onClick={() => setOpenId(open ? null : item.id)}
              transition={reduced ? INSTANT : SHIFT}
              whileTap={reduced ? undefined : { scale: 0.97 }}
              className={cn(
                "max-w-[85%] cursor-pointer self-start rounded-[18px] rounded-bl-md px-4 py-2.5 text-left text-[15px] leading-snug transition-colors duration-200 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                open
                  ? "bg-card font-medium shadow-sm ring-1 ring-border"
                  : "bg-muted hover:bg-muted/70",
              )}
            >
              {item.question}
            </motion.button>
            <AnimatePresence mode="popLayout" initial={false}>
              {open && (
                <motion.div
                  key="answer"
                  layout="position"
                  layoutDependency={openId}
                  initial={{ opacity: 0, scale: 0.6, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{
                    opacity: 0,
                    scale: 0.9,
                    transition: reduced ? INSTANT : LEAVE,
                  }}
                  transition={reduced ? INSTANT : SEND}
                  style={{ originX: 1, originY: 1 }}
                  className="flex items-end justify-end gap-2"
                >
                  <div
                    id={answerId}
                    role="region"
                    aria-labelledby={questionId}
                    className="max-w-[85%] rounded-[18px] rounded-br-md bg-primary px-4 py-2.5 text-[15px] leading-relaxed text-pretty text-primary-foreground"
                  >
                    {item.answer}
                  </div>
                  {avatar && (
                    <span
                      aria-hidden="true"
                      className="flex size-8 shrink-0 items-center justify-center rounded-full bg-card shadow-sm ring-1 ring-border"
                    >
                      {avatar}
                    </span>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </Fragment>
        );
      })}
    </div>
  );
}
