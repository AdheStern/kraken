// src/app/opengraph-image.tsx
// Imagen de vista previa al pegar un enlace de Kraken en Teams o en un correo: solo la marca, nunca datos.
// Se genera en el build (no lee la sesión) y el proxy la deja pasar sin sesión.
import { ImageResponse } from "next/og";

// POR QUÉ: el generador de imágenes no entiende oklch; son los tokens de globals.css en hex.
const BRAND = "#0347a2";
const BRAND_DEEP = "#03266d";
const INK = "#081431";
const CORAL = "#fa8467";
const BLUSH = "#ee7c90";

export const alt = "Kraken by DIMA";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        gap: 56,
        padding: "0 96px",
        background: `linear-gradient(135deg, ${BRAND} 0%, ${BRAND_DEEP} 100%)`,
        color: "white",
      }}
    >
      <svg
        width="260"
        height="260"
        viewBox="-56 -62 112 112"
        aria-hidden="true"
      >
        <path
          d="M-50 18C-50-32-26-58 0-58S50-32 50 18C50 36 32 44 0 44S-50 36-50 18Z"
          fill={CORAL}
        />
        <ellipse cx="-34" cy="22" rx="7" ry="4.5" fill={BLUSH} />
        <ellipse cx="34" cy="22" rx="7" ry="4.5" fill={BLUSH} />
        <ellipse cx="-18" cy="6" rx="9" ry="11" fill={INK} />
        <ellipse cx="18" cy="6" rx="9" ry="11" fill={INK} />
        <circle cx="-15" cy="1" r="3.4" fill="white" />
        <circle cx="21" cy="1" r="3.4" fill="white" />
        <path
          d="M-6 26q6 6 12 0"
          fill="none"
          stroke={INK}
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 140, fontWeight: 700, letterSpacing: -4 }}>
          Kraken
        </div>
        <div style={{ fontSize: 40, opacity: 0.85 }}>by DIMA</div>
        <div style={{ fontSize: 30, opacity: 0.75, marginTop: 28 }}>
          Control de venta, horas, tickets e inventario
        </div>
      </div>
    </div>,
    size,
  );
}
