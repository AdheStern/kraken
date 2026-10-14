---
name: Kraken by DIMA
description: Plataforma interna de DIMA Ltda.; un centro que sostiene ventas, horas, tickets e inventario.
colors:
  dima-blue: "oklch(0.42 0.16 259)"
  dima-blue-deep: "oklch(0.3 0.13 262)"
  dima-blue-bright: "oklch(0.58 0.18 254)"
  abyss-ink: "oklch(0.2 0.06 264)"
  kraken-coral: "oklch(0.74 0.15 35)"
  kraken-coral-deep: "oklch(0.62 0.17 30)"
  kraken-coral-light: "oklch(0.87 0.07 45)"
  kraken-blush: "oklch(0.72 0.14 10)"
  ground-light: "oklch(0.975 0.006 255)"
  ink-light: "oklch(0.21 0.035 262)"
  muted-ink-light: "oklch(0.48 0.035 260)"
  border-light: "oklch(0.9 0.015 255)"
  surface-glass-light: "oklch(1 0 0 / 0.7)"
  surface-solid-light: "oklch(0.995 0.003 255)"
  ground-dark: "oklch(0.155 0.03 263)"
  surface-dark: "oklch(0.205 0.035 263)"
  surface-glass-dark: "oklch(0.25 0.05 262 / 0.6)"
  ink-dark: "oklch(0.955 0.008 255)"
  primary-dark: "oklch(0.7 0.13 252)"
  success-light: "oklch(0.5 0.13 155)"
  warning-light: "oklch(0.58 0.14 70)"
  destructive-light: "oklch(0.55 0.21 27)"
  success-dark: "oklch(0.76 0.14 155)"
  warning-dark: "oklch(0.8 0.14 80)"
  destructive-dark: "oklch(0.7 0.18 24)"
typography:
  display:
    fontFamily: "Nunito, system-ui, sans-serif"
    fontSize: "4.5rem"
    fontWeight: 900
    lineHeight: 1
    letterSpacing: "-0.02em"
  greeting:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1
  label-sm:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.3
  caption:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 400
    lineHeight: 1.3
rounded:
  md: "8px"
  lg: "10px"
  xl: "14px"
  2xl: "18px"
  full: "9999px"
spacing:
  gutter-mobile: "16px"
  card: "32px"
  stack: "16px"
  section: "20px"
components:
  button-primary:
    backgroundColor: "{colors.dima-blue}"
    textColor: "{colors.ground-light}"
    rounded: "{rounded.lg}"
    height: "32px"
  button-microsoft-light:
    backgroundColor: "#ffffff"
    textColor: "#5e5e5e"
    rounded: "{rounded.lg}"
    height: "48px"
  button-microsoft-dark:
    backgroundColor: "#2f2f2f"
    textColor: "#ffffff"
    rounded: "{rounded.lg}"
    height: "48px"
  input:
    rounded: "{rounded.lg}"
    height: "36px"
  chip-glass:
    textColor: "#ffffff"
    rounded: "{rounded.full}"
    padding: "4px 12px"
  card-glass:
    rounded: "{rounded.2xl}"
    padding: "{spacing.card}"
  surface-work:
    backgroundColor: "{colors.surface-glass-light}"
    rounded: "{rounded.xl}"
  surface-solid:
    backgroundColor: "{colors.surface-solid-light}"
    rounded: "{rounded.xl}"
  node-chip:
    textColor: "#ffffff"
    rounded: "{rounded.xl}"
    padding: "10px 16px"
---

# Design System: Kraken by DIMA

## Overview

**Creative North Star: "El centro de la red"**

Kraken es el centro que sostiene el negocio de DIMA. El mundo visual sale del isotipo DIMA: anillos huecos unidos por trazos, sobre un campo comprometido de azul institucional. El kraken chibi coral ocupa el nodo central y sus tentáculos llegan a cada módulo. Es la única nota cálida del sistema y su reacción es la firma del producto.

Por dentro la app es **"La red viva"** (decisión del usuario, 2026-10-14): el marco de trabajo es la misma red del login y el trabajo flota sobre ella en vidrio. El riel azul lleva la red como navegación, el suelo tiene el brillo azul ambiental del login y los contenedores son vidrio esmerilado con sombras en capas teñidas de azul. Los datos densos se quedan sólidos y legibles. Los temas claro y oscuro son de primera clase, y el oscuro conserva el azul como luz: el suelo abisal tiene brillos azules y el riel sigue siendo el campo DIMA.

**Key Characteristics:**
- Campo azul DIMA a sangre con malla de dos brillos: panel del login, riel de la app, banda de Inicio.
- Red de anillos huecos (5 px en los módulos, 3.5 px en los satélites) con aristas de 2 px; en la app es la navegación y el nodo junto a cada título.
- Vidrio esmerilado sobre el campo azul o sobre el brillo del suelo; nunca sobre un liso sin luz.
- Sombras en capas (cercana corta + lejana amplia) teñidas del azul, más largas cuanto más flota la capa.
- Mascota coral vectorial y plana, presente y reactiva: riel, Inicio y estados vacíos.
- Movimiento orquestado: una entrada por pantalla, una firma por gesto, todo apagable con reduced motion.

## Colors

Azul institucional comprometido, neutros teñidos de azul, tres colores de estado y un coral reservado a la mascota.

### Primary
- **Azul DIMA** (dima-blue): el campo de marca, el riel y la acción primaria en claro (`--primary`). Es el #00469D del logo.
- **Azul DIMA profundo / brillante** (dima-blue-deep, dima-blue-bright): los brillos de la malla (`--panel-glow-*`), el brillo ambiental del suelo (`--ground-light-*`) y el foco (`--ring`).
- **Azul acción en oscuro** (primary-dark): la acción primaria en tema oscuro, con texto abyss-ink.

### Secondary
- **Coral kraken** (kraken-coral, con -deep, -light y blush): **solo** la mascota. Contorno, ventosas y mejillas.

### Tertiary
- **Estados** (success, warning, destructive en claro y oscuro): aprobado y activo, riesgo y vencimiento cercano, rechazo y agotado. Aparecen solo donde cargan significado, siempre con texto además del color.

### Neutral
- **Fondo y tinta en claro** (ground-light, ink-light, muted-ink-light, border-light).
- **Vidrio de trabajo** (surface-glass-light / -dark) y **superficie sólida** (surface-solid-light, surface-dark) para datos densos.
- **Fondo, superficie y tinta en oscuro** (ground-dark, surface-dark, ink-dark).
- **Tinta abisal** (abyss-ink): ojos y boca de la mascota, el velo de los diálogos y la nube de tinta.

### Named Rules
**The Coral Is the Kraken Rule.** El coral nunca aparece fuera de la mascota. Si algo necesita calidez o alerta, usa los tokens de estado, no coral.
**The Blue Field Rule.** El azul DIMA ocupa regiones completas (riel, paneles, la banda de Inicio). Teñido o atenuado como fondo de tarjetas genéricas pierde su función.
**The Blue Light Rule.** En oscuro el suelo no es negro plano: lleva los brillos azules ambientales y las sombras se tiñen de azul profundo.

## Typography

**Display Font:** Nunito 900 (con system-ui)
**Body Font:** Geist (con system-ui)

**Character:** Nunito Black, con terminales redondeadas, acompaña a la mascota y al peso del logo DIMA. Geist mantiene la interfaz de trabajo precisa y neutra, con cifras tabulares en toda cantidad.

### Hierarchy
- **Display** (900, 4.5rem desktop / 1.5rem banda móvil / 1.125rem cabecera móvil, 1): solo el wordmark "Kraken".
- **Greeting** (600, 2.25rem desktop / 1.875rem móvil, 1.1, -0.03em): el saludo de Inicio sobre el campo azul.
- **Headline** (600, 1.5rem, -0.02em): el título de cada pantalla, junto al nodo de la red.
- **Body** (400, 0.875rem, 1.5): textos de apoyo en `muted-foreground`.
- **Label** (500, 0.875rem): etiquetas de campo y títulos de panel.
- **Label small** (400, 0.8125rem): celdas de la grilla y etiquetas de formulario en diálogos.
- **Caption** (400, 0.6875rem): pistas bajo una cifra (nodos de Inicio) y el "by DIMA" del riel.

### Named Rules
**The One Wordmark Rule.** Nunito se usa solo para el nombre del producto. Los títulos y el saludo van en Geist.

## Layout

El login divide el desktop en 7/5: el campo de marca a la izquierda y la columna de acceso a la derecha; en móvil el campo se reduce a una banda de 42svh y la tarjeta se superpone 56 px.

La app es un riel azul a la izquierda (offcanvas en móvil, con el kraken y el wordmark en la cabecera) y un área de trabajo de **max-w-6xl** con márgenes de 16 px en móvil y 24 px desde `sm`. Cada módulo abre con su título y nodo, filtros y luego el contenedor de trabajo; los bloques se separan 20 px. Inicio abre con una banda azul de 2 columnas (saludo | red de módulos) y debajo dos paneles en grilla de 2.

## Elevation & Depth

La profundidad viene del vidrio y de sombras en capas teñidas del azul: una sombra cercana corta que asienta la pieza y una lejana amplia que la separa del suelo. Cuanto más flota la capa, más larga la lejana.

### Shadow Vocabulary
- **Vidrio de marca** (`kr-glass`: `inset 0 1px 0 oklch(1 0 0 / 0.35), 0 24px 48px -16px var(--glass-shadow)`): tarjetas y píldoras del login.
- **Superficie de trabajo** (`kr-surface` / `kr-solid`: luz superior + `0 1px 2px var(--shadow-near)` + `0 18px 40px -22px var(--shadow-far)`): listas, paneles y datos.
- **Elevación al pasar** (`kr-lift`: −2 px y `0 26px 50px -24px var(--shadow-far-hover)`): tarjetas clicables.
- **Capa flotante** (`kr-float`: `0 2px 6px` + `0 32px 64px -24px var(--shadow-far-hover)`): diálogos, paneles laterales, menús y selectores, con velo abyss-ink al 25% y blur.
- **Botón primario**: luz superior + `0 8px 18px -10px var(--shadow-far-hover)`.

### Named Rules
**The Glass Needs a View Rule.** El vidrio (`blur` 20–24 px en superficies, 40 px en el login, 10 px en chips) se usa sobre algo que deja ver: el campo azul o el brillo del suelo. Sin `backdrop-filter`, pasa a superficie sólida.
**The Solid Data Rule.** La grilla del CV, los libros y las franjas de cifras van en `kr-solid`: misma sombra, fondo opaco, para que nada pase detrás de los números.

## Shapes

Esquinas suaves y consistentes: 10 px en controles, 14 px en contenedores de trabajo y tarjetas, 18 px en la tarjeta de vidrio del login, píldora completa solo en chips y botones de icono. La geometría de marca son círculos huecos y trazos rectos: nodos del riel, nodo de título, anillo de consumo, nodo del kraken en Inicio y en los vacíos.

## Components

### Buttons
- **Primary:** azul DIMA con texto claro (en oscuro, azul acción con tinta abisal), luz superior y sombra azul corta; baja 1 px al presionar.
- **Microsoft:** sigue la guía de marca de Microsoft; en la pantalla de acceso siempre es la acción dominante.
- **Secondary / outline / ghost:** acciones subordinadas.
- **Focus:** anillo de 3 px en `--ring` al 30–60%.

### Rail (navegación)
Campo azul con malla. Cada módulo es un nodo hueco de 12 px con borde blanco al 60% sobre un trazo vertical de 2 px; el nodo activo es un punto blanco con halo que **viaja por el trazo** al cambiar de módulo (layout animation con resorte). El kraken del riel parpadea y, con aprobaciones pendientes, baja la mirada hacia el menú y flota.

### Module heading
Título (headline) con el nodo de la red a la izquierda: anillo de 3 px en primary con punto central y halo al 14%.

### Surfaces
- **Glass card / chip:** del login (vidrio blanco al 78% / chip blanco al 12% sobre el campo azul).
- **Superficie de trabajo** (`kr-surface`), **sólida** (`kr-solid`) y **flotante** (`kr-float`): ver Elevation.
- **Nodo de Inicio:** chip de vidrio sobre el campo azul con etiqueta, cifra que cuenta (NumberFlow) y pista en caption.

### Kraken (signature)
Mascota vectorial: login (`src/features/auth/components/kraken-*.tsx`) e isotipo reactivo (`src/components/brand/kraken-mark.tsx`). Reacciones:
- **idle:** parpadeo y flotación suave.
- **alert:** mira hacia la navegación y flota (algo espera al usuario).
- **curious:** mira hacia arriba (un filtro no encontró nada).
- **shy / peek / error / loading:** las del login.

Aparece en el riel, en el nodo central de Inicio y en los estados vacíos (`KrakenEmpty`, dentro de un nodo hueco). Con `prefers-reduced-motion` queda quieto y solo cambia la mirada.

### Inputs / Fields
36–40 px de alto, borde `--input`, esquina de 10 px; horas en texto de 24 h. Error con `aria-invalid`, borde y anillo destructivos y mensaje enlazado. `color-scheme` sigue al tema para que los controles nativos sean oscuros en oscuro.

## Motion

Un solo momento con significado por gesto, todo con `cubic-bezier(0.16, 1, 0.3, 1)` y apagable con reduced motion:
- **Entrada de pantalla:** los bloques suben 10 px y aparecen en 420 ms, escalonados 50 ms (CSS, sin esperar a la hidratación).
- **Navegación:** el nodo activo recorre la red con un resorte (motion).
- **Inicio:** una señal de luz recorre una vez los trazos hacia lo pendiente; las cifras cuentan desde 0 (NumberFlow, 900 ms).
- **Datos:** los anillos de consumo se dibujan desde vacío (900 ms) y vuelven a moverse solo cuando cambia el saldo.
- **Capas:** diálogos con zoom 90% y subida de 8 px en 200 ms; paneles laterales en 300 ms.

## Do's and Don'ts

### Do:
- **Do** usar el azul DIMA como campo completo en las regiones de marca, tanto en claro como en oscuro.
- **Do** dibujar la red con anillos huecos y aristas de 2 px; en la app, como navegación y nodo de título.
- **Do** poner el trabajo en vidrio con sombras en capas teñidas de azul, y los datos densos en sólido.
- **Do** escribir los errores y los vacíos diciendo qué pasó y qué hacer, con el kraken en los vacíos.
- **Do** respetar `prefers-reduced-motion` en cada animación.

### Don't:
- **Don't** usar coral fuera de la mascota.
- **Don't** poner vidrio sobre fondos lisos sin luz detrás, ni detrás de celdas de datos.
- **Don't** dejar animaciones ambientales permanentes en la red ni en el suelo.
- **Don't** usar sombras grises neutras ni bordes de 1 px solos como única elevación.
- **Don't** alterar el logo ni los colores del botón de Microsoft.
