-- ============================================================================
-- CORE 8 — Cumplimiento
-- ============================================================================
-- Ya estaba cerrado y aprobado con 6 puntos desde las transcripciones
-- originales: 1) Obligaciones, 2) Documentación obligatoria,
-- 3) Vencimientos, 4) Riesgos, 5) Evidencia y trazabilidad,
-- 6) Alertas y seguimiento. Cadena de control declarada:
--   REQUERIMIENTO → RESPONSABLE → FECHA → ACCIÓN → EVIDENCIA → ESTATUS → RIESGO
--
-- Frontera con CORE 6 (ya documentada ahí): Procedimiento = CÓMO se
-- ejecuta; Cumplimiento = DEMOSTRAR que se cumplió.
--
-- Decisión de diseño: esta tabla NO usa el Motor de Objeto Gobernado.
-- Ese motor es para contenido versionado tipo regla/norma (política,
-- procedimiento, banda salarial, contrato) donde existe un ciclo
-- borrador->aprobación->publicación. Una obligación de cumplimiento y sus
-- instancias periódicas son registros OPERATIVOS de seguimiento, no
-- documentos normativos que se "publican" — se modelan con estatus propio
-- en vez de forzarlas dentro de un motor que no encaja con su naturaleza.
--
-- Normalización de la cadena de control: en vez de repetir
-- RESPONSABLE/FECHA/ACCIÓN/EVIDENCIA/ESTATUS/RIESGO en una sola fila por
-- obligación (que no soporta recurrencia), se separa en:
--   obligacion_cumplimiento = el REQUERIMIENTO (la obligación permanente)
--   cumplimiento_instancia  = una OCURRENCIA concreta de esa obligación
--                             para un período, con el resto de la cadena
-- Una obligación "única" genera exactamente una instancia; una
-- "mensual" genera una instancia por mes.
-- ============================================================================

create type cumplimiento_riesgo_nivel as enum ('bajo', 'medio', 'alto', 'critico');
create type cumplimiento_estatus as enum ('pendiente', 'en_proceso', 'cumplido', 'vencido', 'no_aplica');

-- ----------------------------------------------------------------------------
-- 1) Obligaciones — el REQUERIMIENTO permanente.
-- ----------------------------------------------------------------------------
create table if not exists obligacion_cumplimiento (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresa(id) on delete restrict,
  nombre text not null,
  descripcion text,
  categoria text, -- ej. "Seguridad e Higiene", "Fiscal", "Laboral", "NOM-035"
  periodicidad text not null default 'unica', -- 'unica' | 'mensual' | 'trimestral' | 'semestral' | 'anual'
  responsable_default_puesto_id uuid references puesto(id) on delete set null,
  riesgo_nivel_inherente cumplimiento_riesgo_nivel not null default 'medio', -- riesgo de NO cumplir, en abstracto
  activa boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create index if not exists idx_obligacion_empresa on obligacion_cumplimiento(empresa_id);

comment on table obligacion_cumplimiento is 'CORE 8 (punto 1) — el REQUERIMIENTO permanente. Sus ocurrencias concretas viven en cumplimiento_instancia.';

-- ----------------------------------------------------------------------------
-- 2) Documentación obligatoria — qué documentos exige esta obligación
-- (la exigencia, no la evidencia ya entregada — eso es la instancia).
-- ----------------------------------------------------------------------------
create table if not exists documento_requerido (
  id uuid primary key default gen_random_uuid(),
  obligacion_id uuid not null references obligacion_cumplimiento(id) on delete cascade,
  nombre text not null,
  descripcion text,
  obligatorio boolean not null default true,
  creado_en timestamptz not null default now()
);

create index if not exists idx_documento_requerido_obligacion on documento_requerido(obligacion_id);

comment on table documento_requerido is 'CORE 8 (punto 2) — qué documentos exige la obligación. El documento efectivamente entregado se referencia desde cumplimiento_instancia.evidencia_documento_id.';

-- ----------------------------------------------------------------------------
-- 3-7) cumplimiento_instancia — la cadena de control completa por
-- ocurrencia: REQUERIMIENTO (FK) → RESPONSABLE → FECHA → ACCIÓN →
-- EVIDENCIA → ESTATUS → RIESGO.
-- ----------------------------------------------------------------------------
create table if not exists cumplimiento_instancia (
  id uuid primary key default gen_random_uuid(),
  obligacion_id uuid not null references obligacion_cumplimiento(id) on delete restrict, -- REQUERIMIENTO

  periodo_inicio date not null,
  periodo_fin date not null,
  fecha_limite date not null, -- FECHA (vencimiento de esta ocurrencia)

  responsable_persona_id uuid references persona(id) on delete set null, -- RESPONSABLE (persona concreta de esta ocurrencia)

  accion_realizada text, -- ACCIÓN: qué se hizo para cumplir
  fecha_accion timestamptz,

  evidencia_documento_id uuid, -- EVIDENCIA: referencia lógica a la Gestión Documental transversal (aún no construida)

  estatus cumplimiento_estatus not null default 'pendiente', -- ESTATUS

  riesgo_nivel cumplimiento_riesgo_nivel not null default 'medio', -- RIESGO (puede escalar respecto al inherente de la obligación, ej. si venció)
  riesgo_descripcion text,

  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),

  constraint chk_cumplimiento_periodo check (periodo_fin >= periodo_inicio),
  constraint uq_cumplimiento_instancia_periodo unique (obligacion_id, periodo_inicio, periodo_fin)
);

create index if not exists idx_cumplimiento_instancia_obligacion on cumplimiento_instancia(obligacion_id);
create index if not exists idx_cumplimiento_instancia_responsable on cumplimiento_instancia(responsable_persona_id);
create index if not exists idx_cumplimiento_instancia_estatus on cumplimiento_instancia(estatus);
create index if not exists idx_cumplimiento_instancia_fecha_limite on cumplimiento_instancia(fecha_limite);

comment on table cumplimiento_instancia is 'CORE 8 (puntos 3-5) — una ocurrencia concreta de una obligación: la cadena REQUERIMIENTO->RESPONSABLE->FECHA->ACCIÓN->EVIDENCIA->ESTATUS->RIESGO completa.';

-- ----------------------------------------------------------------------------
-- Evidencia de asistencia/incapacidades — aprobada explícitamente como
-- tipo de evidencia de CORE 8, SIN construir todavía un "reloj checador"
-- (eso sería un subsistema aparte que alimentaría esta tabla más adelante).
-- Por ahora, el origen del dato se registra en `fuente` (manual, importado, etc.).
-- ----------------------------------------------------------------------------
create type evidencia_asistencia_tipo as enum ('entrada', 'salida', 'retardo', 'falta', 'incapacidad', 'vacaciones', 'permiso');

create table if not exists evidencia_asistencia (
  id uuid primary key default gen_random_uuid(),
  persona_id uuid not null references persona(id) on delete restrict,
  fecha date not null,
  tipo_evento evidencia_asistencia_tipo not null,
  hora_entrada time,
  hora_salida time,
  justificacion text,
  evidencia_documento_id uuid, -- referencia lógica a Gestión Documental transversal
  fuente text not null default 'manual', -- 'manual' | 'importado' | futuro: 'reloj_checador'
  vigencia_periodo_inicio date, -- para incapacidad/vacaciones/permiso que abarcan un rango
  vigencia_periodo_fin date,
  creado_en timestamptz not null default now(),

  constraint chk_evidencia_asistencia_vigencia check (vigencia_periodo_fin is null or vigencia_periodo_inicio is null or vigencia_periodo_fin >= vigencia_periodo_inicio)
);

create index if not exists idx_evidencia_asistencia_persona on evidencia_asistencia(persona_id);
create index if not exists idx_evidencia_asistencia_fecha on evidencia_asistencia(fecha);

comment on table evidencia_asistencia is 'CORE 8 — evidencia de asistencia/incapacidades. fuente indica el origen del dato porque todavía no existe un reloj checador integrado.';

-- ----------------------------------------------------------------------------
-- 6) Alertas y seguimiento.
-- ----------------------------------------------------------------------------
create table if not exists alerta_cumplimiento (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresa(id) on delete restrict,
  cumplimiento_instancia_id uuid references cumplimiento_instancia(id) on delete cascade,
  tipo text not null, -- ej. 'proximidad_vencimiento', 'vencido', 'riesgo_alto'
  mensaje text not null,
  fecha_generada timestamptz not null default now(),
  atendida boolean not null default false,
  fecha_atendida timestamptz,
  atendida_por uuid -- referencia lógica a persona(id)
);

create index if not exists idx_alerta_cumplimiento_empresa on alerta_cumplimiento(empresa_id);
create index if not exists idx_alerta_cumplimiento_instancia on alerta_cumplimiento(cumplimiento_instancia_id);
create index if not exists idx_alerta_cumplimiento_pendientes on alerta_cumplimiento(atendida) where atendida = false;

comment on table alerta_cumplimiento is 'CORE 8 (punto 6) — alertas y seguimiento, típicamente generadas por proximidad o incumplimiento de fecha_limite en cumplimiento_instancia.';

-- ----------------------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------------------
alter table obligacion_cumplimiento enable row level security;
alter table documento_requerido enable row level security;
alter table cumplimiento_instancia enable row level security;
alter table evidencia_asistencia enable row level security;
alter table alerta_cumplimiento enable row level security;

create policy "authenticated_read_obligacion" on obligacion_cumplimiento for select to authenticated using (true);
create policy "authenticated_read_documento_requerido" on documento_requerido for select to authenticated using (true);
create policy "authenticated_read_cumplimiento_instancia" on cumplimiento_instancia for select to authenticated using (true);
create policy "authenticated_read_evidencia_asistencia" on evidencia_asistencia for select to authenticated using (true);
create policy "authenticated_read_alerta_cumplimiento" on alerta_cumplimiento for select to authenticated using (true);

-- Nota de privacidad: evidencia_asistencia contiene datos de incapacidad
-- (salud) y permisos. Igual que persona/contrato, la policy de arriba es
-- un placeholder de desarrollo; antes de producción debe restringirse por
-- rol (RH/jefatura directa), nunca "cualquier autenticado lee todo".
