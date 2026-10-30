// src/components/forms/fresh-after-create.tsx
// Vuelve a montar en blanco un formulario de alta cuando su página se oculta después de crear, para que el
// siguiente alta no muestre los datos (ni la pantalla de «listo») del anterior.
"use client";

import {
  createContext,
  Fragment,
  type ReactNode,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

const MarkCreatedContext = createContext<(() => void) | null>(null);

// TRAMPA: con Cache Components la página no se desmonta al navegar (<Activity>): al volver, el estado del alta
// anterior sigue ahí. Ocultarla corre la limpieza de los efectos; ahí se cambia la key. Solo tras crear: un
// borrador sin guardar se conserva, como en el alta de ticket.
export function FreshAfterCreate({ children }: { children: ReactNode }) {
  const [generation, setGeneration] = useState(0);
  const created = useRef(false);
  useLayoutEffect(
    () => () => {
      if (!created.current) return;
      created.current = false;
      setGeneration((g) => g + 1);
    },
    [],
  );

  return (
    <MarkCreatedContext.Provider
      value={() => {
        created.current = true;
      }}
    >
      <Fragment key={generation}>{children}</Fragment>
    </MarkCreatedContext.Provider>
  );
}

// POR QUÉ: el mismo formulario sirve de alta (con envoltorio) y de edición (sin él, nada que limpiar).
export function useMarkCreated() {
  return useContext(MarkCreatedContext) ?? noop;
}

function noop() {}
