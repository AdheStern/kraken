// src/server/authz/admin-permissions.ts
// Permisos de administración del sistema (AGENTS.md §1 roles, §5 Administración): parámetros y catálogos
// de calendario (horarios y feriados).
import { hasRole, type SessionUser } from "./roles";

// REGLA: el administrador del sistema gestiona parámetros y catálogos; no ve montos por ese rol (§2.9).
export function canManageCalendar(user: SessionUser): boolean {
  return hasRole(user, "ADMIN_SISTEMA");
}
