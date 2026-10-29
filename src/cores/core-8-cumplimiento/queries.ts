// CORE 8 — Cumplimiento: obligaciones, instancias, evidencia de
// asistencia y alertas.
//
// Sin motor de versionado aquí (ver nota de diseño en types.ts): las
// inserciones/actualizaciones son directas. `uq_cumplimiento_instancia_periodo`
// ya impide crear dos instancias para el mismo período de una obligación.

import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import type {
  AlertaCumplimiento,
  CumplimientoEstatus,
  CumplimientoInstancia,
  CumplimientoRiesgoNivel,
  DocumentoRequerido,
  EvidenciaAsistencia,
  EvidenciaAsistenciaTipo,
  ObligacionCumplimiento,
} from "./types";

// ---------------------------------------------------------------------------
// Obligaciones (el REQUERIMIENTO)
// ---------------------------------------------------------------------------

export async function listarObligaciones(empresaId: string): Promise<ObligacionCumplimiento[]> {
  const { data, error } = await supabase
    .from("obligacion_cumplimiento")
    .select("*")
    .eq("empresa_id", empresaId)
    .eq("activa", true)
    .order("nombre");
  if (error) throw error;
  return data ?? [];
}

export interface CrearObligacionInput {
  empresaId: string;
  nombre: string;
  descripcion?: string;
  categoria?: string;
  periodicidad?: string;
  responsableDefaultPuestoId?: string;
  riesgoNivelInherente?: CumplimientoRiesgoNivel;
}

export async function crearObligacion(input: CrearObligacionInput): Promise<ObligacionCumplimiento> {
  const { data, error } = await supabase
    .from("obligacion_cumplimiento")
    .insert({
      empresa_id: input.empresaId,
      nombre: input.nombre,
      descripcion: input.descripcion ?? null,
      categoria: input.categoria ?? null,
      periodicidad: input.periodicidad ?? "unica",
      responsable_default_puesto_id: input.responsableDefaultPuestoId ?? null,
      riesgo_nivel_inherente: input.riesgoNivelInherente ?? "medio",
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function agregarDocumentoRequerido(
  obligacionId: string,
  nombre: string,
  opts?: { descripcion?: string; obligatorio?: boolean }
): Promise<DocumentoRequerido> {
  const { data, error } = await supabase
    .from("documento_requerido")
    .insert({
      obligacion_id: obligacionId,
      nombre,
      descripcion: opts?.descripcion ?? null,
      obligatorio: opts?.obligatorio ?? true,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function obtenerDocumentosRequeridos(obligacionId: string): Promise<DocumentoRequerido[]> {
  const { data, error } = await supabase.from("documento_requerido").select("*").eq("obligacion_id", obligacionId);
  if (error) throw error;
  return data ?? [];
}

// ---------------------------------------------------------------------------
// Instancias (la OCURRENCIA concreta — cadena de control completa)
// ---------------------------------------------------------------------------

export interface CrearInstanciaInput {
  obligacionId: string;
  periodoInicio: string;
  periodoFin: string;
  fechaLimite: string;
  responsablePersonaId?: string;
  riesgoNivel?: CumplimientoRiesgoNivel;
}

/** Falla con error de unicidad si ya existe una instancia para ese período. */
export async function crearInstancia(input: CrearInstanciaInput): Promise<CumplimientoInstancia> {
  const { data, error } = await supabase
    .from("cumplimiento_instancia")
    .insert({
      obligacion_id: input.obligacionId,
      periodo_inicio: input.periodoInicio,
      periodo_fin: input.periodoFin,
      fecha_limite: input.fechaLimite,
      responsable_persona_id: input.responsablePersonaId ?? null,
      riesgo_nivel: input.riesgoNivel ?? "medio",
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function listarInstanciasPorObligacion(obligacionId: string): Promise<CumplimientoInstancia[]> {
  const { data, error } = await supabase
    .from("cumplimiento_instancia")
    .select("*")
    .eq("obligacion_id", obligacionId)
    .order("periodo_fin", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/**
 * Dos consultas en vez de un embedding de PostgREST sobre la relación
 * obligacion_cumplimiento->cumplimiento_instancia: así el resultado
 * coincide exactamente con el tipo CumplimientoInstancia (sin un campo
 * `obligacion_cumplimiento` colgado que el tipo no declara), consistente
 * con el patrón usado en el resto del proyecto para resolver relaciones.
 */
export async function listarInstanciasPendientesOVencidas(empresaId: string): Promise<CumplimientoInstancia[]> {
  const { data: obligaciones, error: errorObligaciones } = await supabase
    .from("obligacion_cumplimiento")
    .select("id")
    .eq("empresa_id", empresaId);
  if (errorObligaciones) throw errorObligaciones;
  if (!obligaciones || obligaciones.length === 0) return [];

  const { data, error } = await supabase
    .from("cumplimiento_instancia")
    .select("*")
    .in(
      "obligacion_id",
      obligaciones.map((o) => o.id)
    )
    .in("estatus", ["pendiente", "en_proceso", "vencido"])
    .order("fecha_limite");
  if (error) throw error;
  return data ?? [];
}

export interface RegistrarAccionInput {
  instanciaId: string;
  accionRealizada: string;
  evidenciaDocumentoId?: string;
  nuevoEstatus: CumplimientoEstatus;
}

/** Registra la ACCIÓN + EVIDENCIA y actualiza el ESTATUS de una instancia. */
export async function registrarAccionCumplimiento(input: RegistrarAccionInput): Promise<CumplimientoInstancia> {
  const { data, error } = await supabase
    .from("cumplimiento_instancia")
    .update({
      accion_realizada: input.accionRealizada,
      fecha_accion: new Date().toISOString(),
      evidencia_documento_id: input.evidenciaDocumentoId ?? null,
      estatus: input.nuevoEstatus,
      actualizado_en: new Date().toISOString(),
    })
    .eq("id", input.instanciaId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function escalarRiesgoInstancia(
  instanciaId: string,
  riesgoNivel: CumplimientoRiesgoNivel,
  riesgoDescripcion?: string
): Promise<CumplimientoInstancia> {
  const { data, error } = await supabase
    .from("cumplimiento_instancia")
    .update({ riesgo_nivel: riesgoNivel, riesgo_descripcion: riesgoDescripcion ?? null, actualizado_en: new Date().toISOString() })
    .eq("id", instanciaId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ---------------------------------------------------------------------------
// Evidencia de asistencia
// ---------------------------------------------------------------------------

export interface RegistrarEvidenciaAsistenciaInput {
  personaId: string;
  fecha: string;
  tipoEvento: EvidenciaAsistenciaTipo;
  horaEntrada?: string;
  horaSalida?: string;
  justificacion?: string;
  evidenciaDocumentoId?: string;
  fuente?: string;
  vigenciaPeriodoInicio?: string;
  vigenciaPeriodoFin?: string;
}

/** Falla si vigencia_periodo_fin < vigencia_periodo_inicio (chk_evidencia_asistencia_vigencia). */
export async function registrarEvidenciaAsistencia(input: RegistrarEvidenciaAsistenciaInput): Promise<EvidenciaAsistencia> {
  const { data, error } = await supabase
    .from("evidencia_asistencia")
    .insert({
      persona_id: input.personaId,
      fecha: input.fecha,
      tipo_evento: input.tipoEvento,
      hora_entrada: input.horaEntrada ?? null,
      hora_salida: input.horaSalida ?? null,
      justificacion: input.justificacion ?? null,
      evidencia_documento_id: input.evidenciaDocumentoId ?? null,
      fuente: input.fuente ?? "manual",
      vigencia_periodo_inicio: input.vigenciaPeriodoInicio ?? null,
      vigencia_periodo_fin: input.vigenciaPeriodoFin ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function obtenerEvidenciaAsistenciaPersona(personaId: string, desde?: string, hasta?: string): Promise<EvidenciaAsistencia[]> {
  let query = supabase.from("evidencia_asistencia").select("*").eq("persona_id", personaId);
  if (desde) query = query.gte("fecha", desde);
  if (hasta) query = query.lte("fecha", hasta);
  const { data, error } = await query.order("fecha", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// ---------------------------------------------------------------------------
// Alertas y seguimiento
// ---------------------------------------------------------------------------

export async function crearAlerta(
  empresaId: string,
  tipo: string,
  mensaje: string,
  cumplimientoInstanciaId?: string
): Promise<AlertaCumplimiento> {
  const { data, error } = await supabase
    .from("alerta_cumplimiento")
    .insert({ empresa_id: empresaId, tipo, mensaje, cumplimiento_instancia_id: cumplimientoInstanciaId ?? null })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function listarAlertasPendientes(empresaId: string): Promise<AlertaCumplimiento[]> {
  const { data, error } = await supabase
    .from("alerta_cumplimiento")
    .select("*")
    .eq("empresa_id", empresaId)
    .eq("atendida", false)
    .order("fecha_generada", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function atenderAlerta(alertaId: string, atendidaPor: string): Promise<AlertaCumplimiento> {
  const { data, error } = await supabase
    .from("alerta_cumplimiento")
    .update({ atendida: true, fecha_atendida: new Date().toISOString(), atendida_por: atendidaPor })
    .eq("id", alertaId)
    .select()
    .single();
  if (error) throw error;
  return data;
}
