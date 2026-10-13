// src/features/auth/components/kraken-paws.tsx
// Tentáculos que suben a tapar los ojos del kraken mientras se escribe la contraseña.
// Con contorno para que se lean sobre la cabeza, que es del mismo coral.
import type { KrakenMood } from "./kraken-mood";

type PawState = "hidden" | "cover" | "lowered";

const PAW_TRANSFORM: Record<PawState, string> = {
  hidden: "translateY(64px)",
  cover: "translateY(0px)",
  lowered: "translateY(17px)",
};

export function KrakenPaws({ mood }: { mood: KrakenMood }) {
  const isCovering = mood === "shy" || mood === "peek";
  const left: PawState = isCovering ? "cover" : "hidden";
  const right: PawState =
    mood === "peek" ? "lowered" : isCovering ? "cover" : "hidden";

  return (
    <g>
      <Paw state={left} />
      <g transform="scale(-1 1)">
        <Paw state={right} />
      </g>
    </g>
  );
}

function Paw({ state }: { state: PawState }) {
  return (
    <g
      className="kr-arm"
      style={{
        transform: PAW_TRANSFORM[state],
        opacity: state === "hidden" ? 0 : 1,
      }}
    >
      <path
        d="M-48 66C-52 42-46 20-30 8"
        strokeWidth="19"
        strokeLinecap="round"
        className="fill-none stroke-(--coral-deep)"
      />
      <path
        d="M-48 66C-52 42-46 20-30 8"
        strokeWidth="14"
        strokeLinecap="round"
        className="fill-none stroke-(--coral)"
      />
      <ellipse
        cx="-22"
        cy="1"
        rx="16"
        ry="14"
        strokeWidth="2.5"
        className="fill-(--coral) stroke-(--coral-deep)"
      />
      <circle cx="-29" cy="5" r="2.2" className="fill-(--coral-light)" />
      <circle cx="-19" cy="8" r="2" className="fill-(--coral-light)" />
      <circle cx="-38" cy="40" r="2.2" className="fill-(--coral-light)" />
    </g>
  );
}
