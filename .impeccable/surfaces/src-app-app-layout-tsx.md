---
version: 1
slug: "src-app-app-layout-tsx"
primary_target: "src/app/(app)/layout.tsx"
related_targets: ["src/app/(app)/inicio/page.tsx","src/app/(app)/horas/page.tsx","src/app/(app)/cv/page.tsx"]
---

# App autenticada (shell + módulos) — surface brief

Scope: todo lo que vive bajo `src/app/(app)` (riel, cabecera, Inicio, Control de Venta, Aprobaciones, Bolsas de horas, Administración). Mode: Operate (tareas diarias de ~40 personas de DIMA; escritorio y laptop en sitio).
Audience/job: comerciales, gerentes, ingenieros y administración que crean CV, aprueban, siguen bolsas y mantienen catálogos varias veces al día.
Constraints: la grilla del CV, los libros y las tablas densas siguen sólidos y legibles (vidrio solo en contenedores); controles estándar de shadcn/Base UI; claro y oscuro de primera clase; `prefers-reduced-motion` respetado; WCAG 2.2 AA.
Decisiones del usuario (2026-10-14): intensidad "La red viva"; dependencias motion + NumberFlow; kraken presente y reactivo dentro de la app.

## Direction contract
THESIS: Kraken es el centro de la red de DIMA también por dentro. Rechaza el panel gris genérico de shadcn con un acento: el marco de trabajo es la misma red viva del login, y el trabajo flota sobre ella en vidrio.
OWN-WORLD: riel azul DIMA a sangre con brillos de malla (panel-glow) y la red del isotipo como navegación (nodos huecos de 3.5 px unidos por trazo de 2 px, nodo activo relleno); suelo con brillo azul ambiental (ground-glow) en claro y oscuro; contenedores de vidrio esmerilado (blanco 72% / superficie oscura 55%, blur 20–24 px, borde de luz superior) con sombras en capas teñidas de azul (ambiental amplia + clave corta); estados con success/warning/destructive; coral solo en el kraken.
STORY: al entrar, la persona reconoce la red del login, ve en Inicio qué la espera (aprobaciones, bolsas en riesgo, borradores) y llega a su tarea en un clic; trabajar se siente vivo sin distraer.
FIRST VIEWPORT: riel izquierdo azul con wordmark, mini kraken y los módulos como nodos de la red; cabecera de vidrio pegajosa; Inicio = saludo + red de módulos con números vivos y el kraken reaccionando a lo pendiente; en cada módulo, encabezado + filtros + contenedor de vidrio con la lista.
FORM: extensión del mundo "Red DIMA" del login (marca incompleta → expansión aprobada por el usuario), opción 1 de 3 presentadas ("La red viva"). Firma: al cambiar de módulo, un pulso recorre el trazo de la red del riel hasta el nodo activo; las cifras cuentan hasta su valor (NumberFlow) y los anillos se dibujan al entrar. seed: none (unavailable)
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
