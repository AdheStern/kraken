// src/features/auth/components/kraken-face.tsx
// Dibujo vectorial del kraken chibi (cuerpo, ojos, brazos y boca) centrado en (0,0).
// Sin lógica: recibe el desplazamiento de las pupilas y el ánimo.
import type { KrakenMood } from "./kraken-mood";
import { KrakenPaws } from "./kraken-paws";

type Point = { x: number; y: number };

const ARM_PATH = "M0 0C-6 18-20 28-15 45C-12 55-3 56 1 49";
// POR QUÉ: con la contraseña enfocada los brazos de reposo se esconden; KrakenPaws tapa los ojos.
const ARM_ROTATION: Record<KrakenMood, [left: number, right: number] | null> = {
  idle: [0, 0],
  loading: [-28, 28],
  error: [0, 0],
  shy: null,
  peek: null,
};

export function KrakenFace({
  pupil,
  mood,
}: {
  pupil: Point;
  mood: KrakenMood;
}) {
  const [leftArm, rightArm] = ARM_ROTATION[mood] ?? [-24, 24];
  const isArmHidden = ARM_ROTATION[mood] === null;

  return (
    <g>
      <path
        d="M-62 8C-62-50-32-78 0-78S62-50 62 8C62 34 40 46 0 46S-62 34-62 8Z"
        className="fill-(--coral)"
      />
      <ellipse
        cx="-30"
        cy="-50"
        rx="13"
        ry="7"
        transform="rotate(-32 -30 -50)"
        className="fill-white/35"
      />
      <circle cx="32" cy="-50" r="5" className="fill-(--coral-deep)/45" />
      <circle cx="44" cy="-31" r="3" className="fill-(--coral-deep)/45" />
      <circle cx="-44" cy="-22" r="3.5" className="fill-(--coral-deep)/45" />

      <ellipse cx="-38" cy="18" rx="9" ry="5" className="fill-(--blush)/55" />
      <ellipse cx="38" cy="18" rx="9" ry="5" className="fill-(--blush)/55" />

      <g transform={`translate(${pupil.x} ${pupil.y})`}>
        <g className="kr-blink">
          <Eye cx={-22} />
          <Eye cx={22} />
        </g>
      </g>

      <Mouth mood={mood} />

      <Arm x={-46} y={28} rotation={leftArm} isHidden={isArmHidden} />
      <Arm x={46} y={28} rotation={rightArm} isHidden={isArmHidden} mirrored />
      <KrakenPaws mood={mood} />
    </g>
  );
}

function Eye({ cx }: { cx: number }) {
  return (
    <>
      <ellipse cx={cx} cy="0" rx="11" ry="13" className="fill-(--brand-ink)" />
      <circle cx={cx + 4} cy="-5" r="4" className="fill-white" />
      <circle cx={cx - 3} cy="5" r="1.8" className="fill-white/80" />
    </>
  );
}

function Mouth({ mood }: { mood: KrakenMood }) {
  const stroke = "fill-none stroke-(--brand-ink)";
  if (mood === "shy" || mood === "peek") {
    return (
      <ellipse cx="0" cy="24" rx="3.5" ry="3" className="fill-(--brand-ink)" />
    );
  }
  if (mood === "error") {
    return (
      <path
        d="M-8 26q4-5 8 0t8 0"
        strokeWidth="2.5"
        strokeLinecap="round"
        className={stroke}
      />
    );
  }
  return (
    <path
      d="M-7 20q7 7 14 0"
      strokeWidth="2.5"
      strokeLinecap="round"
      className={stroke}
    />
  );
}

// TRAMPA: el <g> exterior lleva el hombro como origen; la rotación CSS del interior gira en (0,0).
function Arm({
  x,
  y,
  rotation,
  isHidden,
  mirrored = false,
}: {
  x: number;
  y: number;
  rotation: number;
  isHidden: boolean;
  mirrored?: boolean;
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <g
        className="kr-arm"
        style={{
          transform: `rotate(${rotation}deg)`,
          opacity: isHidden ? 0 : 1,
        }}
      >
        <g transform={mirrored ? "scale(-1 1)" : undefined}>
          <path
            d={ARM_PATH}
            strokeWidth="13"
            strokeLinecap="round"
            className="fill-none stroke-(--coral)"
          />
          <circle cx="-9" cy="26" r="2.2" className="fill-(--coral-light)" />
          <circle cx="-13" cy="38" r="2" className="fill-(--coral-light)" />
        </g>
      </g>
    </g>
  );
}
