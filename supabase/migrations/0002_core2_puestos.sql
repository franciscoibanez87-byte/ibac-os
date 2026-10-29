-- ============================================================================
-- CORE 2 — Puestos
-- ============================================================================
-- Fuente de verdad de: catálogo de puestos, perfiles, condiciones inherentes
-- al rol, bandas salariales DE REFERENCIA y KPIs objetivo del puesto.
--
-- Regla de oro aplicada: Puesto define la BANDA salarial de referencia.
-- Puesto NO define el salario pactado — ese es CORE 4 (Contratos), que se
-- construirá después. "Banda/Tabulador ≠ Salario Real".
--
-- Corrección de nomenclatura ya decidida en el diseño: el campo que
-- originalmente se llamaba "Condiciones" se renombra a "condiciones
-- inherentes al rol" para no confundirse con las condiciones PACTADAS en
-- Contrato (CORE 4). Aquí solo describen el rol en abstracto (riesgo,
-- trabajo físico, viajes, disponibilidad, entorno, requerimientos
-- especiales), nunca lo que se negoció con una persona concreta.
--
-- Regla de oro aplicada: "Indicador ≠ Meta específica del Puesto ≠
-- Resultado". kpi_puesto guarda la META que el puesto declara; la
-- DEFINICIÓN general del indicador y el RESULTADO medido viven en CORE 7
-- (Indicadores), que se construirá después y consumirá esta tabla por
-- referencia, nunca la duplicará.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Puesto: catálogo de tipos de trabajo / perfiles.
-- ----------------------------------------------------------------------------
create table if not exists puesto (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresa(id) on delete restrict,
  nombre text not null,
  familia_puesto text, -- agrupador libre (ej. "Operaciones", "Ventas") — catálogo formal pendiente
  nivel text, -- ej. "Operativo", "Supervisión", "Gerencial" — mismo criterio: libre por ahora
  descripcion_general text,
  objetivo_puesto text, -- para qué existe el puesto (distinto de la lista de funciones/procedimiento)
  activo boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create index if not exists idx_puesto_empresa on puesto(empresa_id);

comment on table puesto is 'CORE 2 — catálogo de puestos. Define banda salarial de REFERENCIA, nunca el salario pactado (eso es CORE 4).';

-- Ahora que puesto existe, conectamos la FK lógica que dejamos pendiente
-- en la migración de CORE 1.
alter table plaza
  add constraint fk_plaza_puesto foreign key (puesto_id) references puesto(id) on delete restrict;

-- ----------------------------------------------------------------------------
-- Condiciones inherentes al rol: descripción abstracta del puesto, NO lo
-- pactado con una persona (eso vive en Contrato, CORE 4).
-- ----------------------------------------------------------------------------
create table if not exists puesto_condiciones_inherentes (
  id uuid primary key default gen_random_uuid(),
  puesto_id uuid not null unique references puesto(id) on delete cascade,
  riesgo_exposicion text, -- ej. "Manejo de maquinaria pesada", "Exposición a químicos"
  trabajo_fisico text, -- ej. "Esfuerzo físico moderado", "Trabajo de pie prolongado"
  requiere_viajes boolean not null default false,
  frecuencia_viajes text, -- libre: "Ocasional", "Semanal", "N/A"
  disponibilidad text, -- ej. "Guardia nocturna", "Fines de semana"
  entorno text, -- ej. "Planta", "Oficina", "Campo", "Remoto"
  requerimientos_especiales text, -- licencias, certificaciones físicas, EPP, etc.
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

comment on table puesto_condiciones_inherentes is 'CORE 2 — antes llamado "Condiciones". Describe el rol en abstracto; nunca condiciones pactadas con una persona (ver CORE 4 / Contrato).';

-- ----------------------------------------------------------------------------
-- Banda salarial de referencia: histórica y versionada. Un puesto puede
-- tener varias bandas a lo largo del tiempo (revisión anual, por ejemplo).
-- Esto es SOLO referencia — jamás el salario pactado real.
-- ----------------------------------------------------------------------------
create table if not exists banda_salarial (
  id uuid primary key default gen_random_uuid(),
  puesto_id uuid not null references puesto(id) on delete cascade,
  salario_min numeric(12,2) not null,
  salario_medio numeric(12,2),
  salario_max numeric(12,2) not null,
  moneda text not null default 'MXN',
  vigente_desde date not null default current_date,
  vigente_hasta date,
  creado_en timestamptz not null default now(),

  constraint chk_banda_rango check (salario_max >= salario_min),
  constraint chk_banda_vigencia check (vigente_hasta is null or vigente_hasta >= vigente_desde)
);

create index if not exists idx_banda_puesto on banda_salarial(puesto_id);

-- Un puesto no puede tener dos bandas vigentes (sin fecha de fin) al
-- mismo tiempo — mismo patrón que la Asignación en CORE 1.
create unique index if not exists uq_banda_una_vigente_por_puesto
  on banda_salarial(puesto_id)
  where vigente_hasta is null;

comment on table banda_salarial is 'CORE 2 — banda de REFERENCIA, versionada. El salario pactado real vive exclusivamente en CORE 4 (Contrato).';

-- ----------------------------------------------------------------------------
-- KPI de puesto: la META que el puesto declara para un indicador. No es el
-- indicador en sí (definición general, CORE 7) ni el resultado medido
-- (CORE 7). Es la expectativa que este puesto en particular fija.
-- ----------------------------------------------------------------------------
create table if not exists kpi_puesto (
  id uuid primary key default gen_random_uuid(),
  puesto_id uuid not null references puesto(id) on delete cascade,
  nombre text not null,
  descripcion text,
  meta_valor numeric(12,2),
  meta_unidad text, -- ej. "%", "unidades/día", "pts NPS"
  periodicidad text, -- ej. "mensual", "trimestral", "anual"
  indicador_id uuid, -- referenciará core_7_indicadores.indicador cuando exista esa tabla
  activo boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create index if not exists idx_kpi_puesto_puesto on kpi_puesto(puesto_id);

comment on table kpi_puesto is 'CORE 2 — meta que el puesto fija para un indicador. La definición del indicador y su resultado medido viven en CORE 7.';
comment on column kpi_puesto.indicador_id is 'FK lógica a CORE 7 (indicador). Se añadirá FOREIGN KEY real cuando exista esa tabla.';

-- ----------------------------------------------------------------------------
-- Row Level Security — mismo criterio permisivo que CORE 1: lectura
-- autenticada habilitada, escritura reservada a service_role hasta definir
-- la matriz de permisos por rol.
-- ----------------------------------------------------------------------------
alter table puesto enable row level security;
alter table puesto_condiciones_inherentes enable row level security;
alter table banda_salarial enable row level security;
alter table kpi_puesto enable row level security;

create policy "authenticated_read_puesto" on puesto for select to authenticated using (true);
create policy "authenticated_read_puesto_condiciones" on puesto_condiciones_inherentes for select to authenticated using (true);
create policy "authenticated_read_banda_salarial" on banda_salarial for select to authenticated using (true);
create policy "authenticated_read_kpi_puesto" on kpi_puesto for select to authenticated using (true);
