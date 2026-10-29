// Servicio transversal — Motor de Objeto Gobernado
// Refleja 1:1 supabase/migrations/0005_transversal_objeto_gobernado.sql
//
// Ciclo de vida: borrador -> en_revision -> aprobado -> publicado -> archivado.
// Reutilizado por CORE 5 (Políticas) y CORE 6 (Procedimientos). No crear
// un mecanismo de versionado propio en un CORE nuevo sin primero revisar
// si este motor ya resuelve el caso.

export type ObjetoGobernadoEstado = "borrador" | "en_revision" | "aprobado" | "publicado" | "archivado";
export type ObjetoGobernadoTipo = "politica" | "procedimiento";

export interface ObjetoGobernado {
  id: string;
  objeto_logico_id: string;
  version: number;
  tipo_objeto: ObjetoGobernadoTipo;
  estado: ObjetoGobernadoEstado;
  autor_id: string;
  fecha_creacion: string;
  aprobado_por: string | null;
  fecha_aprobacion: string | null;
  motivo_nueva_version: string | null;
  vigente_desde: string | null;
  vigente_hasta: string | null;
}
