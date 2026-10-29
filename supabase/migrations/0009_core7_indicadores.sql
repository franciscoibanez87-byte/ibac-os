-- ============================================================================
-- CORE 7 — Indicadores
-- ============================================================================
-- Fuente de verdad de: definición de indicadores y sus resultados medidos.
-- "Su función es medir resultados; no ejecuta procesos, no almacena
-- obligaciones, no administra documentos. Recibe datos de los demás
-- COREs para calcular indicadores."
--
-- Regla de oro aplicada: "Indicador ≠ Meta específica del Puesto ≠
-- Resultado". La definición general vive aquí (`indicador`); la META que
-- un puesto en particular fija ya vive en CORE 2 (`kpi_puesto`,
-- construido antes); el RESULTADO medido vive aquí (`resultado_indicador`).
-- Ninguna de las tres se fusiona con las otras dos.
-- ============================================================================

create table if not exists indicador (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresa(id) on delete restrict,
  nombre text not null,
  descripcion text,
  unidad_medida text, -- ej. "%", "unidades/día", "pts NPS", "días"
  periodicidad text, -- ej. "mensual", "trimestral", "anual" — con qué frecuencia se espera medir
  metodo_calculo text, -- descripción de cómo se calcula (texto, no fórmula ejecutable)
  activo boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create index if not exists idx_indicador_empresa on indicador(empresa_id);

comment on table indicador is 'CORE 7 — definición general del indicador. No es la meta de un puesto (CORE 2.kpi_puesto) ni el resultado medido (ver resultado_indicador).';

-- Ahora que indicador existe, conectamos la FK lógica que dejamos
-- pendiente en la migración de CORE 2.
alter table kpi_puesto
  add constraint fk_kpi_puesto_indicador foreign key (indicador_id) references indicador(id) on delete set null;

-- ----------------------------------------------------------------------------
-- Resultado medido de un indicador para un período. Un indicador puede
-- recibir datos de cualquier otro CORE para calcularse — esta tabla no
-- asume de dónde vino el número, solo lo registra.
-- ----------------------------------------------------------------------------
create table if not exists resultado_indicador (
  id uuid primary key default gen_random_uuid(),
  indicador_id uuid not null references indicador(id) on delete cascade,
  periodo_inicio date not null,
  periodo_fin date not null,
  valor numeric(14,2) not null,
  fecha_calculo timestamptz not null default now(),
  calculado_por uuid, -- referencia lógica a persona(id); null si fue un cálculo automatizado
  notas text,
  creado_en timestamptz not null default now(),

  constraint chk_resultado_periodo check (periodo_fin >= periodo_inicio),
  constraint uq_resultado_indicador_periodo unique (indicador_id, periodo_inicio, periodo_fin)
);

create index if not exists idx_resultado_indicador on resultado_indicador(indicador_id);

comment on table resultado_indicador is 'CORE 7 — resultado medido de un indicador en un período. No confundir con la meta (CORE 2.kpi_puesto.meta_valor).';

-- ----------------------------------------------------------------------------
-- Vista de conveniencia: último resultado medido por cada KPI de puesto,
-- comparado contra su meta. Útil para dashboards sin tener que repetir
-- la lógica de "último período" en cada consulta.
-- ----------------------------------------------------------------------------
create or replace view kpi_puesto_resultado_reciente as
select distinct on (kp.id)
  kp.id as kpi_puesto_id,
  kp.puesto_id,
  kp.nombre as kpi_nombre,
  kp.meta_valor,
  kp.meta_unidad,
  ri.id as resultado_id,
  ri.valor as resultado_valor,
  ri.periodo_inicio,
  ri.periodo_fin
from kpi_puesto kp
left join resultado_indicador ri on ri.indicador_id = kp.indicador_id
where kp.activo = true
order by kp.id, ri.periodo_fin desc nulls last;

comment on view kpi_puesto_resultado_reciente is 'CORE 2+7 — compara la meta de cada KPI de puesto contra el resultado medido más reciente del indicador asociado.';

-- ----------------------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------------------
alter table indicador enable row level security;
alter table resultado_indicador enable row level security;

create policy "authenticated_read_indicador" on indicador for select to authenticated using (true);
create policy "authenticated_read_resultado_indicador" on resultado_indicador for select to authenticated using (true);
