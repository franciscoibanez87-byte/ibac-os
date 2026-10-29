-- ============================================================================
-- CORE 5 — Políticas
-- ============================================================================
-- El ciclo de vida (versión/aprobación/vigencia/publicación) vive en el
-- Motor de Objeto Gobernado transversal (0005). Esta tabla solo guarda el
-- CONTENIDO propio de cada versión de política.
-- ============================================================================

create table if not exists politica (
  id uuid primary key default gen_random_uuid(),

  -- FK tipada: garantiza que objeto_gobernado_id apunte a una fila cuyo
  -- tipo_objeto sea realmente 'politica' (ver comentario de diseño en 0005).
  tipo_objeto text not null generated always as ('politica') stored,
  objeto_gobernado_id uuid not null unique,

  empresa_id uuid not null references empresa(id) on delete restrict,
  nombre text not null, -- estable a través de versiones (mismo nombre, nueva versión)
  categoria text, -- ej. "RH", "Seguridad e Higiene", "Compliance"
  cuerpo text not null, -- el contenido/regla de la política en esta versión

  creado_en timestamptz not null default now(),

  foreign key (objeto_gobernado_id, tipo_objeto) references objeto_gobernado(id, tipo_objeto) on delete restrict
);

create index if not exists idx_politica_empresa on politica(empresa_id);

comment on table politica is 'CORE 5 — contenido de política. Versión/aprobación/vigencia/publicación se gestionan vía el objeto_gobernado referenciado, nunca aquí.';

alter table politica enable row level security;

create policy "authenticated_read_politica" on politica for select to authenticated using (true);
