// src/features/help/components/manual-view.tsx
// Manual de un rol: pestañas por rol (los propios primero, marcados) y secciones con pasos numerados y un enlace
// a la pantalla que explican (AGENTS.md §12 F6).
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { GooeyNav } from "@/components/ui/gooey-nav";
import type { ManualChoice } from "../manual-registry";

export function ManualView({ choice }: { choice: ManualChoice }) {
  const { manual, role, tabs } = choice;
  return (
    <>
      <GooeyNav
        label="Manuales por rol"
        active={role}
        items={tabs.map((tab) => ({
          key: tab.role,
          href: `/ayuda?rol=${tab.role}`,
          label: (
            <>
              {tab.isOwn && (
                <span
                  className="size-1.5 rounded-full bg-current opacity-80"
                  aria-hidden="true"
                />
              )}
              {tab.title}
              {tab.isOwn && <span className="sr-only">(tu rol)</span>}
            </>
          ),
        }))}
      />
      <p className="max-w-3xl text-base text-pretty">{manual.summary}</p>
      <div className="grid gap-4 md:grid-cols-2">
        {manual.sections.map((section) => (
          <section
            key={section.heading}
            className="flex flex-col gap-3 rounded-xl border bg-card p-5"
          >
            <h2 className="text-base font-semibold">{section.heading}</h2>
            <ol className="flex flex-1 list-decimal flex-col gap-2 pl-5 text-sm leading-relaxed marker:text-muted-foreground">
              {section.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            {section.link && (
              <Link
                href={section.link.href}
                className="inline-flex items-center gap-1 self-start text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                {section.link.label}
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            )}
          </section>
        ))}
      </div>
    </>
  );
}
