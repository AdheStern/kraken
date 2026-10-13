// src/features/auth/components/module-chips.tsx
// Rótulos de vidrio de cada módulo, alineados bajo su nodo de la red.
import { MODULE_NODES, toPercent } from "./network-layout";

const LABEL_OFFSET = 26;

export function ModuleChips() {
  return (
    <ul aria-hidden="true" className="pointer-events-none absolute inset-0">
      {MODULE_NODES.map((node) => (
        <li
          key={node.id}
          className="kr-glass-chip absolute -translate-x-1/2 rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap"
          style={{
            left: toPercent(node.x),
            top: toPercent(node.y + LABEL_OFFSET),
          }}
        >
          {node.label}
        </li>
      ))}
    </ul>
  );
}
