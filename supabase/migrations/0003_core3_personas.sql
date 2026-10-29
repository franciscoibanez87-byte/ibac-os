-- ============================================================================
-- CORE 3 — Personas / Expedientes
-- ============================================================================
-- Fuente de verdad de: identidad de la persona y su expediente.
--
-- Corrección crítica ya decidida en el diseño: Persona NO tiene salario
-- como dato propio. El "historial salarial" es una VISTA DERIVADA que lee
-- las versiones de Contrato (CORE 4) — ver vista `historial_salarial` en
-- la migración 0004_core4_contratos.sql (depende de que exista `contrato`).
--
-- Campos de identidad alineados al expediente laboral mínimo del Art. 804
-- LFT (nombre, domicilio, identificadores oficiales, fecha de nacimiento).
-- ============================================================================

create type persona_estatus as enum ('activo', 'baja', 'baja_temporal');

create table if not exists persona (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresa(id) on delete restrict,

  -- Identidad
  nombres text not null,
  apellido_paterno text not null,
  apellido_materno text,
  fecha_nacimiento date,
  genero text,

  -- Identificadores oficiales (México) — campos de esquema; el llenado y
  -- cifrado/enmascarado en la capa de aplicación queda fuera de esta
  -- migración.
  curp text,
  rfc text,
  nss text,

  -- Contacto
  email_personal text,
  telefono text,
  domicilio text,

  -- Estatus del expediente (NO es la ocupación de una plaza — eso se
  -- deriva de `asignacion` en CORE 1; este estatus es del expediente
  -- de la persona como tal).
  estatus persona_estatus not null default 'activo',

  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create index if not exists idx_persona_empresa on persona(empresa_id);
create unique index if not exists uq_persona_curp on persona(curp) where curp is not null;

comment on table persona is 'CORE 3 — identidad y expediente de la persona. NUNCA almacena salario propio: ver vista historial_salarial (deriva de CORE 4).';

-- Ahora que persona existe, conectamos la FK lógica que dejamos pendiente
-- en la migración de CORE 1 (Asignación Persona↔Plaza↔Vigencia).
alter table asignacion
  add constraint fk_asignacion_persona foreign key (persona_id) references persona(id) on delete restrict;

-- ----------------------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------------------
alter table persona enable row level security;

create policy "authenticated_read_persona" on persona for select to authenticated using (true);

-- Nota de privacidad: persona contiene datos sensibles (CURP, RFC, NSS,
-- fecha de nacimiento, domicilio). La policy de solo-lectura autenticada
-- de arriba es un placeholder de desarrollo igual que en CORE 1/2 — antes
-- de producción, esta tabla en particular debería tener una policy más
-- estricta (ej. por rol RH/Nómina) en vez de "cualquier autenticado lee
-- todo". Queda señalado aquí para no perderlo cuando se diseñe la matriz
-- de permisos.
