-- ============================================================================
-- REFACTOR — CORE 2 (banda_salarial) y CORE 4 (contrato) adoptan el Motor
-- de Objeto Gobernado
-- ============================================================================
-- La migración 0005 documentó esta inconsistencia como decisión pendiente:
-- CORE 2 y CORE 4 tenían su propio versionado ad hoc, contradiciendo la
-- arquitectura documentada ("consumido por CORE 2 → 4 → 5 → 6"). Esta
-- migración la resuelve: ambas tablas pasan a ser satélites del
-- objeto_gobernado, igual que politica y procedimiento.
--
-- SUPUESTO EXPLÍCITO: esta migración hace DROP COLUMN sin backfill. Asume
-- que banda_salarial y contrato están vacías en cualquier entorno donde se
-- aplique (cierto hoy: el proyecto no tiene datos reales en producción,
-- solo pruebas en bases de datos desechables). Si alguna vez se aplica
-- contra una base con datos reales, el chequeo de abajo lo detiene en
-- seco en vez de perder datos en silencio.
-- ============================================================================

do $$
begin
  if exists (select 1 from banda_salarial) then
    raise exception 'banda_salarial tiene % fila(s) existente(s); esta migración asume la tabla vacía y hace DROP COLUMN sin backfill. Diseñar un backfill antes de continuar.', (select count(*) from banda_salarial);
  end if;
  if exists (select 1 from contrato) then
    raise exception 'contrato tiene % fila(s) existente(s); esta migración asume la tabla vacía y hace DROP COLUMN sin backfill. Diseñar un backfill antes de continuar.', (select count(*) from contrato);
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 1) Objetos dependientes que hay que quitar antes de alterar columnas.
-- ----------------------------------------------------------------------------
drop view if exists historial_salarial;
drop function if exists registrar_nueva_version_contrato(uuid, uuid, text, contrato_tipo, contrato_modalidad, contrato_jornada, contrato_periodicidad_pago, numeric, text, text, date, date, date);

-- ----------------------------------------------------------------------------
-- 2) objeto_gobernado: ampliar los tipos de objeto permitidos.
-- ----------------------------------------------------------------------------
alter table objeto_gobernado drop constraint objeto_gobernado_tipo_objeto_check;
alter table objeto_gobernado add constraint objeto_gobernado_tipo_objeto_check
  check (tipo_objeto in ('politica', 'procedimiento', 'banda_salarial', 'contrato'));

-- ----------------------------------------------------------------------------
-- 3) banda_salarial: quitar versionado propio, enganchar a objeto_gobernado.
-- ----------------------------------------------------------------------------
drop index if exists uq_banda_una_vigente_por_puesto;

alter table banda_salarial drop column vigente_desde;
alter table banda_salarial drop column vigente_hasta;

alter table banda_salarial add column tipo_objeto text not null generated always as ('banda_salarial') stored;
alter table banda_salarial add column objeto_gobernado_id uuid;
-- unique + not null + FK se agregan en pasos separados para poder dar un
-- mensaje de error claro si algo quedó mal (en vez de un error genérico
-- de NOT NULL sobre una tabla que debería estar vacía).
alter table banda_salarial alter column objeto_gobernado_id set not null;
alter table banda_salarial add constraint uq_banda_salarial_objeto_gobernado unique (objeto_gobernado_id);
alter table banda_salarial add foreign key (objeto_gobernado_id, tipo_objeto) references objeto_gobernado(id, tipo_objeto) on delete restrict;

comment on table banda_salarial is 'CORE 2 — banda de REFERENCIA. Versión/aprobación/vigencia/publicación viven en el objeto_gobernado referenciado (ver registrar_banda_salarial).';

-- ----------------------------------------------------------------------------
-- 4) contrato: quitar versionado propio, enganchar a objeto_gobernado.
-- ----------------------------------------------------------------------------
drop index if exists uq_contrato_una_vigente_por_persona;

alter table contrato drop constraint chk_contrato_version_motivo;
alter table contrato drop constraint uq_contrato_persona_version;
alter table contrato drop constraint chk_contrato_vigencia;

alter table contrato drop column version;
alter table contrato drop column motivo_modificacion;
alter table contrato drop column vigente_desde;
alter table contrato drop column vigente_hasta;

alter table contrato add column tipo_objeto text not null generated always as ('contrato') stored;
alter table contrato add column objeto_gobernado_id uuid;
alter table contrato alter column objeto_gobernado_id set not null;
alter table contrato add constraint uq_contrato_objeto_gobernado unique (objeto_gobernado_id);
alter table contrato add foreign key (objeto_gobernado_id, tipo_objeto) references objeto_gobernado(id, tipo_objeto) on delete restrict;

comment on table contrato is 'CORE 4 — fuente ÚNICA de verdad salarial. Versión/aprobación/vigencia/publicación viven en el objeto_gobernado referenciado (ver registrar_contrato).';

-- ----------------------------------------------------------------------------
-- 5) Vista historial_salarial, reconstruida sobre objeto_gobernado.
-- ----------------------------------------------------------------------------
create or replace view historial_salarial as
select
  c.persona_id,
  og.version,
  c.salario_pactado,
  c.moneda,
  og.vigente_desde,
  og.vigente_hasta,
  og.motivo_nueva_version as motivo_modificacion,
  (og.estado = 'publicado' and og.vigente_hasta is null) as es_version_vigente
from contrato c
join objeto_gobernado og on og.id = c.objeto_gobernado_id
order by c.persona_id, og.version;

comment on view historial_salarial is 'CORE 3+4 — historial salarial DERIVADO de las versiones de Contrato (vía objeto_gobernado). Persona nunca almacena salario propio.';

-- ----------------------------------------------------------------------------
-- 6) Funciones de dominio: encapsulan "encontrar el lineage existente (si
-- lo hay) y revisarlo, o crear uno nuevo" para que el llamador nunca tenga
-- que rastrear objeto_logico_id a mano — ese era el principal riesgo de
-- usar el motor genérico directamente (crear por error un segundo lineage
-- paralelo para el mismo puesto/persona).
--
-- Ni banda_salarial ni contrato modelan un flujo de aprobación separado
-- de un tercero (a diferencia de política/procedimiento, donde SÍ hay un
-- humano distinto que aprueba): para cuando HR registra un contrato ya
-- firmado, o decide una banda salarial, el dato ya es autoritativo de
-- inmediato. Por eso estas funciones aprueban y publican en el mismo
-- paso, con autor_id como autor Y aprobador. Esto reproduce el
-- comportamiento anterior (sin aprobación) mientras sí deja registro de
-- versión/vigencia en el motor compartido.
-- ----------------------------------------------------------------------------

create or replace function registrar_banda_salarial(
  p_puesto_id uuid,
  p_salario_min numeric,
  p_salario_max numeric,
  p_autor_id uuid,
  p_salario_medio numeric default null,
  p_moneda text default 'MXN',
  p_motivo_nueva_version text default null,
  p_vigente_desde date default current_date
) returns banda_salarial
language plpgsql
security definer
set search_path = public
as $$
declare
  v_objeto_logico_id uuid;
  v_objeto_gobernado objeto_gobernado;
  v_nueva banda_salarial;
begin
  select og.objeto_logico_id into v_objeto_logico_id
  from banda_salarial bs
  join objeto_gobernado og on og.id = bs.objeto_gobernado_id
  where bs.puesto_id = p_puesto_id
  order by og.version desc
  limit 1;

  v_objeto_gobernado := crear_version_objeto_gobernado('banda_salarial', p_autor_id, v_objeto_logico_id, p_motivo_nueva_version);
  v_objeto_gobernado := aprobar_objeto_gobernado(v_objeto_gobernado.id, p_autor_id);
  v_objeto_gobernado := publicar_objeto_gobernado(v_objeto_gobernado.id, p_vigente_desde);

  insert into banda_salarial (puesto_id, salario_min, salario_medio, salario_max, moneda, objeto_gobernado_id)
  values (p_puesto_id, p_salario_min, p_salario_medio, p_salario_max, p_moneda, v_objeto_gobernado.id)
  returning * into v_nueva;

  return v_nueva;
end;
$$;

comment on function registrar_banda_salarial is 'CORE 2 — única vía soportada para crear o revisar una banda salarial. Encuentra el lineage existente del puesto automáticamente.';

create or replace function registrar_contrato(
  p_persona_id uuid,
  p_empresa_id uuid,
  p_tipo_contrato contrato_tipo,
  p_modalidad contrato_modalidad,
  p_jornada_pactada contrato_jornada,
  p_periodicidad_pago contrato_periodicidad_pago,
  p_salario_pactado numeric,
  p_autor_id uuid,
  p_moneda text default 'MXN',
  p_condiciones_contractuales text default null,
  p_fecha_inicio date default current_date,
  p_fecha_fin date default null,
  p_motivo_nueva_version text default null,
  p_vigente_desde date default current_date
) returns contrato
language plpgsql
security definer
set search_path = public
as $$
declare
  v_objeto_logico_id uuid;
  v_objeto_gobernado objeto_gobernado;
  v_nueva contrato;
begin
  select og.objeto_logico_id into v_objeto_logico_id
  from contrato c
  join objeto_gobernado og on og.id = c.objeto_gobernado_id
  where c.persona_id = p_persona_id
  order by og.version desc
  limit 1;

  v_objeto_gobernado := crear_version_objeto_gobernado('contrato', p_autor_id, v_objeto_logico_id, p_motivo_nueva_version);
  v_objeto_gobernado := aprobar_objeto_gobernado(v_objeto_gobernado.id, p_autor_id);
  v_objeto_gobernado := publicar_objeto_gobernado(v_objeto_gobernado.id, p_vigente_desde);

  insert into contrato (
    persona_id, empresa_id, tipo_contrato, modalidad, jornada_pactada, periodicidad_pago,
    salario_pactado, moneda, condiciones_contractuales, fecha_inicio, fecha_fin, objeto_gobernado_id
  ) values (
    p_persona_id, p_empresa_id, p_tipo_contrato, p_modalidad, p_jornada_pactada, p_periodicidad_pago,
    p_salario_pactado, p_moneda, p_condiciones_contractuales, p_fecha_inicio, p_fecha_fin, v_objeto_gobernado.id
  )
  returning * into v_nueva;

  return v_nueva;
end;
$$;

comment on function registrar_contrato is 'CORE 4 — única vía soportada para crear o revisar un contrato (incluyendo cambios salariales). Encuentra el lineage existente de la persona automáticamente.';

-- ----------------------------------------------------------------------------
-- 7) Corrección a publicar_objeto_gobernado, encontrada probando este
-- mismo refactor: si la nueva vigente_desde es igual o anterior a la de
-- la versión actualmente vigente, el cierre automático calcula
-- vigente_hasta = vigente_desde_nueva - 1 día, que puede quedar ANTES del
-- vigente_desde de esa misma fila vigente — violando su propio CHECK de
-- vigencia con un error genérico y confuso. Se agrega una validación
-- explícita con un mensaje claro en vez de dejar que reviente el CHECK.
-- ----------------------------------------------------------------------------
create or replace function publicar_objeto_gobernado(
  p_id uuid,
  p_vigente_desde date default current_date
) returns objeto_gobernado
language plpgsql
security definer
set search_path = public
as $$
declare
  v_estado_actual objeto_gobernado_estado;
  v_objeto_logico_id uuid;
  v_vigente_desde_anterior date;
  v_resultado objeto_gobernado;
begin
  select estado, objeto_logico_id into v_estado_actual, v_objeto_logico_id
  from objeto_gobernado where id = p_id;

  if v_estado_actual is null then
    raise exception 'objeto_gobernado % no existe', p_id;
  end if;

  if v_estado_actual <> 'aprobado' then
    raise exception 'solo se puede publicar un objeto ya aprobado (estado actual: %)', v_estado_actual;
  end if;

  select vigente_desde into v_vigente_desde_anterior
  from objeto_gobernado
  where objeto_logico_id = v_objeto_logico_id
    and estado = 'publicado'
    and vigente_hasta is null;

  if v_vigente_desde_anterior is not null and p_vigente_desde <= v_vigente_desde_anterior then
    raise exception 'vigente_desde (%) debe ser POSTERIOR a la vigente_desde de la versión actualmente vigente (%)', p_vigente_desde, v_vigente_desde_anterior;
  end if;

  -- Cierra la versión previamente vigente del mismo objeto lógico.
  update objeto_gobernado
  set vigente_hasta = p_vigente_desde - interval '1 day', estado = 'archivado'
  where objeto_logico_id = v_objeto_logico_id
    and estado = 'publicado'
    and vigente_hasta is null;

  update objeto_gobernado
  set estado = 'publicado', vigente_desde = p_vigente_desde, vigente_hasta = null
  where id = p_id
  returning * into v_resultado;

  return v_resultado;
end;
$$;

comment on function publicar_objeto_gobernado is 'Única vía para publicar. Cierra y archiva automáticamente la versión previamente vigente del mismo objeto lógico. Exige que la nueva vigente_desde sea posterior a la de la versión que reemplaza.';
