// src/domain/clock.ts
// Fuente de tiempo inyectable: el dominio nunca llama a Date.now() (AGENTS.md regla 8).

export type Clock = {
  now: () => Date;
};
