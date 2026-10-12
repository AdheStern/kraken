-- prisma/sql/core.sql
-- Restricciones del esquema core que Prisma no expresa: rangos de franjas y unicidad con columnas nulas.

ALTER TABLE core.horario_franja
  ADD CONSTRAINT horario_franja_dia_semana_ck CHECK (dia_semana BETWEEN 1 AND 7),
  ADD CONSTRAINT horario_franja_rango_ck CHECK (minuto_inicio >= 0 AND minuto_inicio < minuto_fin AND minuto_fin <= 1440);

-- POR QUÉ: area_id y ciudad_id nulos significan "sin área" o "nacional"; con NULLS DISTINCT se podrían duplicar.
DROP INDEX core.usuario_rol_unico;
CREATE UNIQUE INDEX usuario_rol_unico ON core.usuario_rol (usuario_id, rol_id, area_id) NULLS NOT DISTINCT;

DROP INDEX core.grupo_entra_rol_unico;
CREATE UNIQUE INDEX grupo_entra_rol_unico ON core.grupo_entra_rol (grupo_entra_id, rol_id, area_id) NULLS NOT DISTINCT;

DROP INDEX core.feriado_unico;
CREATE UNIQUE INDEX feriado_unico ON core.feriado (fecha, ciudad_id) NULLS NOT DISTINCT;
