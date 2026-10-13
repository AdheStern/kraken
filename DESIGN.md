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
  ground-dark: "oklch(0.155 0.03 263)"
  surface-dark: "oklch(0.205 0.035 263)"
  ink-dark: "oklch(0.955 0.008 255)"
  primary-dark: "oklch(0.7 0.13 252)"
  destructive-light: "oklch(0.55 0.21 27)"
  destructive-dark: "oklch(0.7 0.18 24)"
typography:
  display:
    fontFamily: "Nunito, system-ui, sans-serif"
    fontSize: "4.5rem"
    fontWeight: 900
    lineHeight: 1
    letterSpacing: "-0.02em"
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
rounded:
  md: "8px"
  lg: "10px"
  2xl: "18px"
  full: "9999px"
spacing:
  gutter-mobile: "16px"
  card: "32px"
  stack: "16px"
components:
  button-primary:
    backgroundColor: "{colors.dima-blue}"
    textColor: "{colors.ground-light}"
    rounded: "{rounded.lg}"
    height: "40px"
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
    height: "40px"
  chip-glass:
    textColor: "#ffffff"
    rounded: "{rounded.full}"
    padding: "4px 12px"
  card-glass:
    rounded: "{rounded.2xl}"
    padding: "{spacing.card}"
---

# Design System: Kraken by DIMA

## Overview

**Creative North Star: "El centro de la red"**

Kraken es el centro que sostiene el negocio de DIMA. El mundo visual sale del isotipo DIMA: anillos huecos unidos por trazos, sobre un campo comprometido de azul institucional. El kraken chibi coral ocupa el nodo central y sus tentáculos llegan a cada módulo. Es la única nota cálida del sistema y su reacción es la firma del producto.

La interfaz de trabajo es sobria y densa como una herramienta: neutros teñidos de azul, Geist y controles estándar de shadcn/ui. La marca vive en tres sitios: el campo azul, la red y la mascota. El vidrio esmerilado se usa solo donde deja ver algo de la marca detrás. Los temas claro y oscuro son de primera clase, y el oscuro conserva el azul DIMA como campo; no lo reemplaza por negro.

**Key Characteristics:**
- Campo azul DIMA a sangre como región de marca, nunca como acento disperso.
- Red de anillos huecos (trazo de 5 px en los módulos, 3.5 px en los satélites) con aristas de 2 px.
- Mascota coral vectorial y plana, sin sombreado ni textura.
- Vidrio esmerilado solo sobre el campo azul o la red.
- Un solo momento de movimiento por superficie.

## Colors

Azul institucional comprometido, neutros teñidos de azul y un coral reservado a la mascota.

### Primary
- **Azul DIMA** (dima-blue): el campo de marca y la acción primaria en claro (`--primary`). Es el #00469D del logo.
- **Azul DIMA profundo / brillante** (dima-blue-deep, dima-blue-bright): los brillos de la malla del panel y el foco (`--ring`).
- **Azul acción en oscuro** (primary-dark): la acción primaria en tema oscuro, con texto abyss-ink.

### Secondary
- **Coral kraken** (kraken-coral, con -deep, -light y blush): **solo** la mascota. Contorno, ventosas y mejillas.

### Neutral
- **Fondo y tinta en claro** (ground-light, ink-light, muted-ink-light, border-light).
- **Fondo, superficie y tinta en oscuro** (ground-dark, surface-dark, ink-dark).
- **Tinta abisal** (abyss-ink): ojos y boca de la mascota, y la nube de tinta.

### Named Rules
**The Coral Is the Kraken Rule.** El coral nunca aparece fuera de la mascota. Si algo necesita calidez o alerta, usa los tokens de estado, no coral.
**The Blue Field Rule.** El azul DIMA ocupa regiones completas (paneles, bandas). Teñido o atenuado como fondo de tarjetas genéricas pierde su función.

## Typography

**Display Font:** Nunito 900 (con system-ui)
**Body Font:** Geist (con system-ui)

**Character:** Nunito Black, con terminales redondeadas, acompaña a la mascota y al peso del logo DIMA. Geist mantiene la interfaz de trabajo precisa y neutra.

### Hierarchy
- **Display** (900, 4.5rem desktop / 1.5rem banda móvil, 1): solo el wordmark "Kraken".
- **Headline** (600, 1.5rem, tracking -0.02em): el título de cada pantalla ("Inicia sesión").
- **Body** (400, 0.875rem, 1.5): textos de apoyo en `muted-foreground`.
- **Label** (500, 0.875rem): etiquetas de campo y rótulos de chips (0.75rem).

### Named Rules
**The One Wordmark Rule.** Nunito se usa solo para el nombre del producto. Los títulos de pantalla van en Geist.

## Layout

El login divide el desktop en 7/5: el campo de marca a la izquierda y la columna de acceso a la derecha. La tarjeta cruza la costura entre ambos para que el vidrio deje ver el azul. En móvil el campo de marca se reduce a una banda de 42svh (mínimo 288 px) y la tarjeta se superpone 56 px a la banda. Los márgenes laterales son de 16 px en móvil. El arte de la red es cuadrado y escala con el alto de la ventana (`min(640px, 64vh)`), así no choca con el wordmark en pantallas de 720 px.

## Elevation & Depth

La profundidad viene del vidrio y de una sombra ambiental teñida de azul, no de capas de sombras.

### Shadow Vocabulary
- **Vidrio** (`inset 0 1px 0 oklch(1 0 0 / 0.35), 0 24px 48px -16px var(--glass-shadow)`): solo en tarjetas y píldoras de vidrio.

### Named Rules
**The Glass Needs a View Rule.** El vidrio (`blur(40px) saturate(1.4)` en tarjetas, `blur(10px)` en chips) solo se usa sobre algo que deja ver: el campo azul o la red. Sobre un fondo liso es una tarjeta opaca. Con `@supports not (backdrop-filter)` pasa a fondo sólido.

## Shapes

Esquinas suaves y consistentes: 10 px en controles, 18 px en tarjetas y píldora completa solo en chips y botones de icono. La geometría de marca son círculos huecos y trazos rectos de la red; la mascota usa curvas cerradas con trazo redondeado.

## Components

### Buttons
- **Shape:** esquina suave (10 px).
- **Primary:** azul DIMA con texto claro (en oscuro, azul acción con tinta abisal); 40 px de alto en formularios.
- **Microsoft:** sigue la guía de marca de Microsoft. Logo de cuatro cuadros sin alterar; blanco con borde #8C8C8C y texto #5E5E5E en claro, #2F2F2F en oscuro; 48 px de alto. En la pantalla de acceso siempre es la acción dominante.
- **Secondary:** `secondary` para acciones subordinadas a la principal de la pantalla (p. ej. "Entrar" del acceso de emergencia).
- **Focus:** anillo de 3 px en `--ring` al 50–60%.

### Chips
- **Glass chip:** blanco al 12% con borde blanco al 24%, texto blanco y píldora completa. Solo rotula nodos sobre el campo azul.

### Cards / Containers
- **Glass card:** esquina de 18 px, padding de 24 px en móvil y 32 px desde `sm`, `--glass-bg` (blanco al 78% en claro, superficie oscura al 55% en oscuro) y borde `--glass-border`.

### Inputs / Fields
- **Style:** 40 px de alto, borde `--input`, fondo `background/60` dentro del vidrio y esquina de 10 px.
- **Error:** `aria-invalid` con borde y anillo destructivos; el mensaje va debajo, en texto destructivo y enlazado por `aria-describedby`.

### Kraken (signature)
Mascota vectorial en `src/features/auth/components/kraken-*.tsx`. Reacciones:
- **idle:** parpadeo y flotación suave; los ojos siguen al puntero o al campo con foco.
- **shy:** tentáculos con contorno coral profundo tapan los ojos con la contraseña enfocada.
- **peek:** el tentáculo derecho baja al mostrar la contraseña.
- **error:** sacude la cabeza 420 ms, frunce la boca y suelta una nube de tinta.
- **loading:** un pulso recorre la red mientras se redirige.

Con `prefers-reduced-motion` todo queda estático y solo cambia la pose.

## Do's and Don'ts

### Do:
- **Do** usar el azul DIMA como campo completo en las regiones de marca, tanto en claro como en oscuro.
- **Do** dibujar la red con anillos huecos y enmascarar las aristas dentro de los anillos.
- **Do** reservar el movimiento de la red para un solo momento con significado (redirigir, cargar).
- **Do** escribir los errores en español diciendo qué hacer ("Espera un minuto e intenta de nuevo").

### Don't:
- **Don't** usar coral fuera de la mascota.
- **Don't** poner vidrio sobre fondos lisos donde no deja ver nada.
- **Don't** dejar animaciones ambientales permanentes en la red.
- **Don't** alterar el logo ni los colores del botón de Microsoft.
- **Don't** hacer que una acción secundaria compita visualmente con el botón de Microsoft.
