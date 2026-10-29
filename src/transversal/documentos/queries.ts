// Servicio Transversal — Gestión Documental: lecturas y las dos únicas
// vías soportadas para crear/revisar un documento (RPCs atómicas).
//
// IMPORTANTE: nunca hacer un `update` directo sobre una fila existente de
// `documento`. Para subir un documento nuevo usar `subirDocumento`; para
// reemplazar/corregir uno existente usar `subirNuevaVersionDocumento`,
// que cierra la versión vigente y crea la siguiente de forma atómica.

import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import type {
  Documento,
  DocumentoAsociacion,
  DocumentoAsociacionVigente,
  DocumentoEvento,
  DocumentoNivelAcceso,
  DocumentoPermiso,
  DocumentoPermisoVigente,
} from "./types";

// Bucket privado creado en 0015_transversal_storage_documentos.sql. Todo
// acceso de lectura pasa por obtenerUrlDescarga (URL firmada, corta
// duración) — nunca por una URL pública directa.
const BUCKET = "documentos";

function generarStoragePath(empresaId: string, nombreArchivo: string): string {
  return `${empresaId}/${crypto.randomUUID()}-${nombreArchivo}`;
}

export async function obtenerDocumentoVigente(documentoLogicoId: string): Promise<Documento | null> {
  const { data, error } = await supabase
    .from("documento")
    .select("*")
    .eq("documento_logico_id", documentoLogicoId)
    .eq("vigente", true)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function listarVersiones(documentoLogicoId: string): Promise<Documento[]> {
  const { data, error } = await supabase
    .from("documento")
    .select("*")
    .eq("documento_logico_id", documentoLogicoId)
    .order("version");
  if (error) throw error;
  return data ?? [];
}

export interface SubirDocumentoInput {
  empresaId: string;
  nombre: string;
  storagePath: string;
  subidoPor?: string;
  descripcion?: string;
  categoria?: string;
  mimeType?: string;
  tamanoBytes?: number;
  metadatos?: Record<string, unknown>;
}

/** Crea la versión 1 de un documento nuevo. */
export async function subirDocumento(input: SubirDocumentoInput): Promise<Documento> {
  const { data, error } = await supabase.rpc("subir_documento", {
    p_empresa_id: input.empresaId,
    p_nombre: input.nombre,
    p_storage_path: input.storagePath,
    p_subido_por: input.subidoPor ?? null,
    p_descripcion: input.descripcion ?? null,
    p_categoria: input.categoria ?? null,
    p_mime_type: input.mimeType ?? null,
    p_tamano_bytes: input.tamanoBytes ?? null,
    p_metadatos: input.metadatos ?? {},
  });
  if (error) throw error;
  return data as Documento;
}

export interface SubirNuevaVersionDocumentoInput {
  documentoLogicoId: string;
  storagePath: string;
  /** Obligatorio: por qué se sube esta nueva versión. */
  motivoNuevaVersion: string;
  subidoPor?: string;
  nombre?: string;
  descripcion?: string;
  categoria?: string;
  mimeType?: string;
  tamanoBytes?: number;
  metadatos?: Record<string, unknown>;
}

/** Revisa atómicamente un documento existente: cierra la versión vigente y crea la siguiente. */
export async function subirNuevaVersionDocumento(input: SubirNuevaVersionDocumentoInput): Promise<Documento> {
  const { data, error } = await supabase.rpc("subir_nueva_version_documento", {
    p_documento_logico_id: input.documentoLogicoId,
    p_storage_path: input.storagePath,
    p_motivo_nueva_version: input.motivoNuevaVersion,
    p_subido_por: input.subidoPor ?? null,
    p_nombre: input.nombre ?? null,
    p_descripcion: input.descripcion ?? null,
    p_categoria: input.categoria ?? null,
    p_mime_type: input.mimeType ?? null,
    p_tamano_bytes: input.tamanoBytes ?? null,
    p_metadatos: input.metadatos ?? null,
  });
  if (error) throw error;
  return data as Documento;
}

// ---------------------------------------------------------------------------
// Subida con archivo real (Supabase Storage) — las dos funciones de arriba
// (subirDocumento/subirNuevaVersionDocumento) solo registran metadatos;
// estas dos envuelven ese registro con la subida real al bucket privado
// "documentos". Si el insert en `documento` falla después de subir el
// archivo, se borra el archivo huérfano del bucket antes de relanzar el
// error — nunca dejar un archivo sin fila que lo referencie.
// ---------------------------------------------------------------------------

export interface SubirDocumentoConArchivoInput {
  empresaId: string;
  nombre: string;
  archivo: File;
  subidoPor?: string;
  descripcion?: string;
  categoria?: string;
  metadatos?: Record<string, unknown>;
}

/** Sube el archivo al bucket "documentos" y crea la v1 del documento lógico. */
export async function subirDocumentoConArchivo(input: SubirDocumentoConArchivoInput): Promise<Documento> {
  const storagePath = generarStoragePath(input.empresaId, input.archivo.name);
  const { error: errorSubida } = await supabase.storage.from(BUCKET).upload(storagePath, input.archivo, {
    contentType: input.archivo.type || undefined,
  });
  if (errorSubida) throw errorSubida;

  try {
    return await subirDocumento({
      empresaId: input.empresaId,
      nombre: input.nombre,
      storagePath,
      subidoPor: input.subidoPor,
      descripcion: input.descripcion,
      categoria: input.categoria,
      mimeType: input.archivo.type || undefined,
      tamanoBytes: input.archivo.size,
      metadatos: input.metadatos,
    });
  } catch (err) {
    await supabase.storage.from(BUCKET).remove([storagePath]);
    throw err;
  }
}

export interface SubirNuevaVersionDocumentoConArchivoInput {
  documentoLogicoId: string;
  empresaId: string;
  archivo: File;
  /** Obligatorio: por qué se sube esta nueva versión. */
  motivoNuevaVersion: string;
  subidoPor?: string;
  nombre?: string;
  descripcion?: string;
  categoria?: string;
}

/** Sube el archivo de la nueva versión y la registra atómicamente (cierra la vigente anterior). */
export async function subirNuevaVersionDocumentoConArchivo(
  input: SubirNuevaVersionDocumentoConArchivoInput
): Promise<Documento> {
  const storagePath = generarStoragePath(input.empresaId, input.archivo.name);
  const { error: errorSubida } = await supabase.storage.from(BUCKET).upload(storagePath, input.archivo, {
    contentType: input.archivo.type || undefined,
  });
  if (errorSubida) throw errorSubida;

  try {
    return await subirNuevaVersionDocumento({
      documentoLogicoId: input.documentoLogicoId,
      storagePath,
      motivoNuevaVersion: input.motivoNuevaVersion,
      subidoPor: input.subidoPor,
      nombre: input.nombre,
      descripcion: input.descripcion,
      categoria: input.categoria,
      mimeType: input.archivo.type || undefined,
      tamanoBytes: input.archivo.size,
    });
  } catch (err) {
    await supabase.storage.from(BUCKET).remove([storagePath]);
    throw err;
  }
}

/** URL firmada de corta duración — el bucket es privado, nunca hay una URL pública directa. */
export async function obtenerUrlDescarga(storagePath: string, expiraEnSegundos = 300): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, expiraEnSegundos);
  if (error) throw error;
  return data.signedUrl;
}

// ---------------------------------------------------------------------------
// Asociación — siempre al documento LÓGICO (sobrevive a nuevas versiones,
// ver fix de 0014). `documentoLogicoId` es el `documento_logico_id` de
// cualquier versión (o, equivalentemente, el `id` de la versión 1).
// ---------------------------------------------------------------------------

export async function asociarDocumento(documentoLogicoId: string, entidadTipo: string, entidadId: string): Promise<DocumentoAsociacion> {
  const { data, error } = await supabase
    .from("documento_asociacion")
    .insert({ documento_logico_id: documentoLogicoId, entidad_tipo: entidadTipo, entidad_id: entidadId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Resuelto a la versión vigente de cada documento — nunca a una versión superada. */
export async function obtenerDocumentosDeEntidad(entidadTipo: string, entidadId: string): Promise<DocumentoAsociacionVigente[]> {
  const { data, error } = await supabase
    .from("documento_asociacion_vigente")
    .select("*")
    .eq("entidad_tipo", entidadTipo)
    .eq("entidad_id", entidadId);
  if (error) throw error;
  return data ?? [];
}

// ---------------------------------------------------------------------------
// Permisos — igual que la asociación, siempre al documento LÓGICO.
// ---------------------------------------------------------------------------

export interface OtorgarPermisoInput {
  documentoLogicoId: string;
  nivelAcceso?: DocumentoNivelAcceso;
  /** Exactamente uno de los dos: puestoId o personaId. */
  puestoId?: string;
  personaId?: string;
}

export async function otorgarPermiso(input: OtorgarPermisoInput): Promise<DocumentoPermiso> {
  const { data, error } = await supabase
    .from("documento_permiso")
    .insert({
      documento_logico_id: input.documentoLogicoId,
      puesto_id: input.puestoId ?? null,
      persona_id: input.personaId ?? null,
      nivel_acceso: input.nivelAcceso ?? "lectura",
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Resuelto a la versión vigente del documento — nunca a una versión superada. */
export async function obtenerPermisosDeDocumento(documentoLogicoId: string): Promise<DocumentoPermisoVigente[]> {
  const { data, error } = await supabase
    .from("documento_permiso_vigente")
    .select("*")
    .eq("documento_logico_id", documentoLogicoId);
  if (error) throw error;
  return data ?? [];
}

// ---------------------------------------------------------------------------
// Trazabilidad
// ---------------------------------------------------------------------------

export async function obtenerBitacoraDocumento(documentoId: string): Promise<DocumentoEvento[]> {
  const { data, error } = await supabase
    .from("documento_evento")
    .select("*")
    .eq("documento_id", documentoId)
    .order("creado_en");
  if (error) throw error;
  return data ?? [];
}

export async function registrarEventoDocumento(
  documentoId: string,
  tipoEvento: "descargado" | "acceso_denegado" | "eliminado",
  actorId?: string,
  detalle?: string
): Promise<DocumentoEvento> {
  const { data, error } = await supabase
    .from("documento_evento")
    .insert({ documento_id: documentoId, tipo_evento: tipoEvento, actor_id: actorId ?? null, detalle: detalle ?? null })
    .select()
    .single();
  if (error) throw error;
  return data;
}
