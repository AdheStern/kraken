# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
About 40 internal staff of DIMA Ltda. (Bolivia: La Paz, Santa Cruz, Cochabamba): general manager, area managers, sales (KAM/AM), presales, postsales engineers, support coordinators, warehouse, administration, and the system administrator. Most work at office desktops; engineers also work from laptops at client sites; warehouse uses a tablet for the internal POS. A person may hold several roles.

## Product Purpose
Kraken by DIMA centralizes the business that today lives in hundreds of Excel files: Sales Control (CV) with parallel approval by area, hour bags consumed from tickets and projects, inventory with warehouses and transfers, and role dashboards. Success: sales stop creating CVs in Excel, managers approve in the platform, and hours are discounted exactly and never above what was sold.

## Positioning
One hub that holds every part of DIMA's operation with full history, built on DIMA's own rules (CV numbering per city, 8x5/24x7 hour weighting, business calendars per city), not a generic ERP.

## Operating Context
- Sign-in is Microsoft Entra ID (single tenant, DIMA's Microsoft 365 accounts) for all staff.
- One emergency email/password account exists for the system administrator, seeded from environment variables; public sign-up is disabled.
- Interface language is Spanish (Bolivia); code is English. Business calendar in America/La_Paz.
- Light and dark themes are both first-class.

## Capabilities and Constraints
- Next.js App Router monolith, shadcn/ui (Base UI) + Tailwind, Better Auth.
- Normative rules live in AGENTS.md; it wins over code.
- Undecided: final KPI set, SLA values, exact warehouses (see AGENTS.md §14).

## Brand Commitments
- Name: "Kraken by DIMA" (confirmed 2026-10-13). Kraken is the product; DIMA Ltda. is the company.
- DIMA institutional blue #00469D and the DIMA logo (blue and white PNGs in `public/brand/`). The DIMA isotype is a network of hollow ring nodes joined by strokes.
- Kraken mascot: a chibi kraken/octopus in coral, authored as vector art (user request).
- User asked for glass textures, transparencies and opacities, used with judgment.

## Evidence on Hand
- `public/brand/dima-logo.png`, `public/brand/dima-logo-white.png`.
- No customer data, metrics, or testimonials are to be shown on public surfaces; none exist yet.

## Product Principles
- Excel users must feel faster here than in Excel: keyboard, paste, duplicate.
- Money and time are exact; the interface never rounds away the truth.
- Every empty state and error says what to do next.
- One login, one place: the staff never has to remember another password.

## Accessibility & Inclusion
WCAG 2.2 AA: text contrast ≥4.5:1, visible keyboard focus, `prefers-reduced-motion` respected, errors announced to screen readers.
