-- ============================================================================
-- Servicio transversal — Gestión Documental: bucket de Supabase Storage
-- ============================================================================
-- Hasta esta migración, documento.storage_path era una columna de texto sin
-- un lugar real donde apuntara. Este bucket es ese lugar: PRIVADO (public =
-- false) — todo acceso pasa por el backend de Next.js (cliente service_role)
-- o por URLs firmadas de corta duración, nunca por una URL pública directa.
--
-- Guardia deliberada: el esquema `storage` lo crea la plataforma de
-- Supabase, no una migración — un Postgres plano (como el que levanta
-- supabase/tests/run.sh) no lo tiene. Sin este `if exists`, esta migración
-- rompería el harness de pruebas local. El resto del proyecto corre sobre
-- Postgres puro a propósito; esta es la única migración con una dependencia
-- real de la plataforma Supabase, así que se aísla explícitamente aquí.
do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    execute $sql$
      insert into storage.buckets (id, name, public)
      values ('documentos', 'documentos', false)
      on conflict (id) do nothing
    $sql$;

    -- Mismo criterio que el resto del proyecto: lectura autenticada,
    -- escritura reservada a service_role hasta definir la matriz de
    -- permisos por rol.
    execute $sql$
      create policy "authenticated_read_documentos_bucket"
      on storage.objects for select
      to authenticated
      using (bucket_id = 'documentos')
    $sql$;
  end if;
end $$;
