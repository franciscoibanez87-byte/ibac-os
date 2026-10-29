// Servicio Transversal — Gestión Documental
// Refleja 1:1 supabase/migrations/0011_transversal_gestion_documental.sql
//
// 7 capacidades: almacenamiento, versionamiento, metadatos, clasificación,
// asociación, permisos, trazabilidad. Consumido por CORE 3→4→5→6→8.
//
// Versionamiento propio (NO usa el Motor de Objeto Gobernado): un
// documento almacenado no tiene ciclo normativo borrador→aprobado→
// publicado, solo versiones sucesivas donde la más reciente es "vigente".
// Nunca editar un `documento` existente directamente — usar
// `subirNuevaVersionDocumento`.

export type DocumentoNivelAcceso = "lectura" | "escritura";
export type DocumentoTipoEvento = "subido" | "version_nueva" | "descargado" | "acceso_denegado" | "eliminado";

export interface Documento {
  id: string;
  /** Agrupa todas las versiones de "el mismo documento". En v1, igual a `id`. */
  documento_logico_id: string;
  version: number;
  vigente: boolean;

  empresa_id: string;
  nombre: string;
  descripcion: string | null;
  categoria: string | null;
  mime_type: string | null;
  storage_path: string;
  tamano_bytes: number | null;
  metadatos: Record<string, unknown>;

  /** Referencia lógica a persona(id). */
  subido_por: string | null;
  motivo_nueva_version: string | null;

  creado_en: string;
}

/**
 * Vincula un documento LÓGICO (sobrevive a nuevas versiones — ver fix de
 * 0014) a cualquier entidad del sistema (referencia lógica, no FK tipado).
 * `documento_logico_id` referencia documento.documento_logico_id, nunca
 * una versión puntual.
 */
export interface DocumentoAsociacion {
  id: string;
  documento_logico_id: string;
  entidad_tipo: string;
  entidad_id: string;
  creado_en: string;
}

/** Igual que DocumentoAsociacion: apunta al documento lógico, no a una versión. */
export interface DocumentoPermiso {
  id: string;
  documento_logico_id: string;
  puesto_id: string | null;
  persona_id: string | null;
  nivel_acceso: DocumentoNivelAcceso;
  creado_en: string;
}

/** Fila de la vista documento_asociacion_vigente — ya resuelta a la versión vigente. */
export interface DocumentoAsociacionVigente {
  id: string;
  documento_logico_id: string;
  entidad_tipo: string;
  entidad_id: string;
  creado_en: string;
  documento_id: string;
  version: number;
  nombre: string;
  categoria: string | null;
  mime_type: string | null;
  storage_path: string;
}

/** Fila de la vista documento_permiso_vigente — ya resuelta a la versión vigente. */
export interface DocumentoPermisoVigente {
  id: string;
  documento_logico_id: string;
  puesto_id: string | null;
  persona_id: string | null;
  nivel_acceso: DocumentoNivelAcceso;
  creado_en: string;
  documento_id: string;
  version: number;
  nombre: string;
}

export interface DocumentoEvento {
  id: string;
  documento_id: string;
  tipo_evento: DocumentoTipoEvento;
  actor_id: string | null;
  detalle: string | null;
  creado_en: string;
}
