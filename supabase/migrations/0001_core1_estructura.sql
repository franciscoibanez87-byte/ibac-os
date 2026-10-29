-- ============================================================================
-- CORE 1 — Estructura Organizacional
-- ============================================================================
-- Fuente de verdad de: entidades legales, sedes, áreas, direcciones,
-- jefaturas, plazas (autorizadas/ocupadas/vacantes) y la Asignación
-- Persona↔Plaza↔Vigencia.
--
-- Regla de oro aplicada: "Asignación" vive aquí, NO en CORE 3 (Personas).
-- Persona NO tiene campo de puesto/plaza propio: su ocupación actual se
-- DERIVA leyendo la Asignación vigente, nunca se duplica como dato propio.
--
-- Nota de alcance: persona_id y puesto_id son UUID sin FK todavía, porque
-- CORE 2 (Puestos) y CORE 3 (Personas) aún no existen como tablas. Cuando
-- esas migraciones se creen, agregar los FOREIGN KEY correspondientes.
-- ============================================================================

create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- ----------------------------------------------------------------------------
-- Empresa: entidad(es) legal(es) del cliente. Un cliente puede tener más de
-- una razón social operando bajo la misma instancia (holding / grupo).
-- ----------------------------------------------------------------------------
create table if not exists empresa (
  id uuid primary key default gen_random_uuid(),
  razon_social text not null,
  rfc text,
  nombre_comercial text,
  activa boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

comment on table empresa is 'CORE 1 — entidad(es) legal(es) del cliente dentro de esta instancia.';

-- ----------------------------------------------------------------------------
-- Sede: ubicación física / centro de trabajo.
-- ----------------------------------------------------------------------------
create table if not exists sede (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresa(id) on delete restrict,
  nombre text not null,
  direccion text,
  ciudad text,
  estado text,
  activa boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create index if not exists idx_sede_empresa on sede(empresa_id);

-- ----------------------------------------------------------------------------
-- Área / Dirección / Jefatura: jerarquía organizacional.
-- Se modelan como un solo árbol auto-referenciado (unidad_organizacional)
-- con un "tipo" en vez de 3 tablas separadas, para no triplicar lógica de
-- jerarquía idéntica. El tipo distingue el nivel para reportes y reglas.
-- ----------------------------------------------------------------------------
create type unidad_organizacional_tipo as enum ('direccion', 'area', 'jefatura');

create table if not exists unidad_organizacional (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresa(id) on delete restrict,
  sede_id uuid references sede(id) on delete set null,
  tipo unidad_organizacional_tipo not null,
  nombre text not null,
  unidad_padre_id uuid references unidad_organizacional(id) on delete restrict,
  activa boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create index if not exists idx_unidad_empresa on unidad_organizacional(empresa_id);
create index if not exists idx_unidad_padre on unidad_organizacional(unidad_padre_id);

comment on table unidad_organizacional is 'CORE 1 — árbol de Dirección/Área/Jefatura. El tipo indica el nivel jerárquico.';

-- ----------------------------------------------------------------------------
-- Plaza: posición autorizada dentro de la estructura. Puede existir sin
-- ocupante (regla maestra #5 del dominio: "Una Plaza puede existir sin
-- ocupante").
-- ----------------------------------------------------------------------------
create type plaza_estado as enum ('autorizada', 'ocupada', 'vacante', 'congelada', 'eliminada');

create table if not exists plaza (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresa(id) on delete restrict,
  unidad_organizacional_id uuid not null references unidad_organizacional(id) on delete restrict,
  puesto_id uuid, -- referenciará core_2_puestos.puesto cuando exista esa migración
  plaza_jefe_inmediato_id uuid references plaza(id) on delete set null,
  codigo text, -- clave interna de la plaza, si el cliente la usa
  estado plaza_estado not null default 'autorizada',
  fecha_autorizacion date not null default current_date,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create index if not exists idx_plaza_unidad on plaza(unidad_organizacional_id);
create index if not exists idx_plaza_puesto on plaza(puesto_id);
create index if not exists idx_plaza_jefe on plaza(plaza_jefe_inmediato_id);

comment on table plaza is 'CORE 1 — posición autorizada. Una Plaza no puede tener dos ocupantes principales simultáneos (se controla vía Asignación, no aquí).';
comment on column plaza.puesto_id is 'FK lógica a CORE 2 (puesto). Se añadirá FOREIGN KEY real cuando exista la tabla puesto.';

-- ----------------------------------------------------------------------------
-- Asignación: Persona ↔ Plaza ↔ Vigencia. ÚNICA fuente de verdad de quién
-- ocupa qué plaza y cuándo. Persona (CORE 3) jamás derivará esto de un
-- campo propio: siempre se lee la Asignación vigente.
-- ----------------------------------------------------------------------------
create type asignacion_tipo as enum ('titular', 'interino', 'cobertura_temporal', 'doble_funcion');
create type asignacion_estatus as enum ('activa', 'finalizada', 'cancelada');

create table if not exists asignacion (
  id uuid primary key default gen_random_uuid(),
  plaza_id uuid not null references plaza(id) on delete restrict,
  persona_id uuid not null, -- referenciará core_3_personas.persona cuando exista esa migración
  tipo asignacion_tipo not null default 'titular',
  estatus asignacion_estatus not null default 'activa',
  fecha_inicio date not null,
  fecha_fin date,
  motivo_cambio text,
  evento_movimiento_id uuid, -- referenciará transversal.evento_movimiento cuando exista esa tabla
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),

  constraint chk_asignacion_vigencia check (fecha_fin is null or fecha_fin >= fecha_inicio)
);

create index if not exists idx_asignacion_plaza on asignacion(plaza_id);
create index if not exists idx_asignacion_persona on asignacion(persona_id);

comment on table asignacion is 'CORE 1 — única fuente de verdad de ocupación Persona↔Plaza↔Vigencia. Ninguna otra tabla debe duplicar este hecho.';

-- Una plaza no puede tener dos asignaciones "titular" activas simultáneas
-- (regla maestra: "Una Plaza no puede tener dos ocupantes principales
-- simultáneos").
create unique index if not exists uq_plaza_un_titular_activo
  on asignacion(plaza_id)
  where estatus = 'activa' and tipo = 'titular';

-- ----------------------------------------------------------------------------
-- Row Level Security — placeholder.
-- Con el modelo de "una instancia Supabase por cliente" no hace falta filtrar
-- por empresa_id entre clientes (el aislamiento ya lo da la instancia), pero
-- SÍ conviene exigir autenticación y, más adelante, aplicar la matriz de
-- permisos por rol (pendiente, no iniciada según la auditoría de arquitectura).
-- Este bloque es intencionalmente permisivo para destrabar desarrollo; NO usar
-- así en producción sin revisar la matriz de permisos.
-- ----------------------------------------------------------------------------
alter table empresa enable row level security;
alter table sede enable row level security;
alter table unidad_organizacional enable row level security;
alter table plaza enable row level security;
alter table asignacion enable row level security;

create policy "authenticated_read_empresa" on empresa for select to authenticated using (true);
create policy "authenticated_read_sede" on sede for select to authenticated using (true);
create policy "authenticated_read_unidad" on unidad_organizacional for select to authenticated using (true);
create policy "authenticated_read_plaza" on plaza for select to authenticated using (true);
create policy "authenticated_read_asignacion" on asignacion for select to authenticated using (true);

-- Escritura: por ahora solo via service_role (backend), hasta definir matriz
-- de permisos por rol. No se crean policies de insert/update/delete para
-- 'authenticated' deliberadamente.
