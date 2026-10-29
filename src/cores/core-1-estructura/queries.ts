// CORE 1 — Estructura Organizacional: lecturas y escrituras.
//
// A diferencia de banda_salarial/contrato/objeto_gobernado, ninguna tabla
// de este CORE tiene un ciclo de versionado protegido por función atómica
// — son inserciones/actualizaciones directas. La única invariante que la
// base de datos protege activamente es `uq_plaza_un_titular_activo`: una
// plaza no puede tener dos asignaciones "titular" activas a la vez. El
// cliente debe estar preparado para que `crearAsignacion` falle por esa
// restricción y mostrar un mensaje claro, no reintentar a ciegas.

import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import type {
  Asignacion,
  AsignacionTipo,
  Empresa,
  Plaza,
  PlazaEstado,
  Sede,
  UnidadOrganizacional,
  UnidadOrganizacionalTipo,
} from "./types";

// ---------------------------------------------------------------------------
// Empresa
// ---------------------------------------------------------------------------

export async function listarEmpresas(): Promise<Empresa[]> {
  const { data, error } = await supabase.from("empresa").select("*").eq("activa", true).order("razon_social");
  if (error) throw error;
  return data ?? [];
}

export async function obtenerEmpresa(id: string): Promise<Empresa | null> {
  const { data, error } = await supabase.from("empresa").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export interface CrearEmpresaInput {
  razonSocial: string;
  rfc?: string;
  nombreComercial?: string;
}

export async function crearEmpresa(input: CrearEmpresaInput): Promise<Empresa> {
  const { data, error } = await supabase
    .from("empresa")
    .insert({ razon_social: input.razonSocial, rfc: input.rfc ?? null, nombre_comercial: input.nombreComercial ?? null })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ---------------------------------------------------------------------------
// Sede
// ---------------------------------------------------------------------------

export async function listarSedes(empresaId: string): Promise<Sede[]> {
  const { data, error } = await supabase.from("sede").select("*").eq("empresa_id", empresaId).eq("activa", true).order("nombre");
  if (error) throw error;
  return data ?? [];
}

export interface CrearSedeInput {
  empresaId: string;
  nombre: string;
  direccion?: string;
  ciudad?: string;
  estado?: string;
}

export async function crearSede(input: CrearSedeInput): Promise<Sede> {
  const { data, error } = await supabase
    .from("sede")
    .insert({
      empresa_id: input.empresaId,
      nombre: input.nombre,
      direccion: input.direccion ?? null,
      ciudad: input.ciudad ?? null,
      estado: input.estado ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ---------------------------------------------------------------------------
// Unidad Organizacional (árbol Dirección/Área/Jefatura)
// ---------------------------------------------------------------------------

/** Lista plana; construir el árbol en la capa de presentación agrupando por `unidad_padre_id`. */
export async function listarUnidadesOrganizacionales(empresaId: string): Promise<UnidadOrganizacional[]> {
  const { data, error } = await supabase
    .from("unidad_organizacional")
    .select("*")
    .eq("empresa_id", empresaId)
    .eq("activa", true)
    .order("nombre");
  if (error) throw error;
  return data ?? [];
}

export interface CrearUnidadOrganizacionalInput {
  empresaId: string;
  tipo: UnidadOrganizacionalTipo;
  nombre: string;
  sedeId?: string;
  unidadPadreId?: string;
}

export async function crearUnidadOrganizacional(input: CrearUnidadOrganizacionalInput): Promise<UnidadOrganizacional> {
  const { data, error } = await supabase
    .from("unidad_organizacional")
    .insert({
      empresa_id: input.empresaId,
      tipo: input.tipo,
      nombre: input.nombre,
      sede_id: input.sedeId ?? null,
      unidad_padre_id: input.unidadPadreId ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ---------------------------------------------------------------------------
// Plaza
// ---------------------------------------------------------------------------

export async function listarPlazas(empresaId: string, estado?: PlazaEstado): Promise<Plaza[]> {
  let query = supabase.from("plaza").select("*").eq("empresa_id", empresaId);
  if (estado) query = query.eq("estado", estado);
  const { data, error } = await query.order("fecha_autorizacion", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listarPlazasDeUnidad(unidadOrganizacionalId: string): Promise<Plaza[]> {
  const { data, error } = await supabase.from("plaza").select("*").eq("unidad_organizacional_id", unidadOrganizacionalId);
  if (error) throw error;
  return data ?? [];
}

export interface CrearPlazaInput {
  empresaId: string;
  unidadOrganizacionalId: string;
  puestoId?: string;
  plazaJefeInmediatoId?: string;
  codigo?: string;
  estado?: PlazaEstado;
}

/** Una plaza puede existir sin ocupante — nace en 'autorizada' por defecto. */
export async function crearPlaza(input: CrearPlazaInput): Promise<Plaza> {
  const { data, error } = await supabase
    .from("plaza")
    .insert({
      empresa_id: input.empresaId,
      unidad_organizacional_id: input.unidadOrganizacionalId,
      puesto_id: input.puestoId ?? null,
      plaza_jefe_inmediato_id: input.plazaJefeInmediatoId ?? null,
      codigo: input.codigo ?? null,
      estado: input.estado ?? "autorizada",
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function actualizarEstadoPlaza(plazaId: string, estado: PlazaEstado): Promise<Plaza> {
  const { data, error } = await supabase
    .from("plaza")
    .update({ estado, actualizado_en: new Date().toISOString() })
    .eq("id", plazaId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ---------------------------------------------------------------------------
// Asignación (Persona ↔ Plaza ↔ Vigencia)
// ---------------------------------------------------------------------------

export interface CrearAsignacionInput {
  plazaId: string;
  personaId: string;
  fechaInicio: string;
  tipo?: AsignacionTipo;
  motivoCambio?: string;
  /** Referencia al movimiento que originó esta asignación (ver transversal/eventos), si aplica. */
  eventoMovimientoId?: string;
}

/**
 * Falla con el error de la BD (código 23505) si la plaza ya tiene una
 * asignación "titular" activa — `uq_plaza_un_titular_activo` lo impide.
 * No reintentar automáticamente: significa que hay que cerrar la
 * asignación anterior primero (ver `finalizarAsignacion`).
 */
export async function crearAsignacion(input: CrearAsignacionInput): Promise<Asignacion> {
  const { data, error } = await supabase
    .from("asignacion")
    .insert({
      plaza_id: input.plazaId,
      persona_id: input.personaId,
      fecha_inicio: input.fechaInicio,
      tipo: input.tipo ?? "titular",
      motivo_cambio: input.motivoCambio ?? null,
      evento_movimiento_id: input.eventoMovimientoId ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function finalizarAsignacion(asignacionId: string, fechaFin: string, motivo?: string): Promise<Asignacion> {
  const { data, error } = await supabase
    .from("asignacion")
    .update({
      estatus: "finalizada",
      fecha_fin: fechaFin,
      motivo_cambio: motivo ?? null,
      actualizado_en: new Date().toISOString(),
    })
    .eq("id", asignacionId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** El/los titular(es) o cobertura vigente(s) de una plaza en este momento. */
export async function obtenerAsignacionesActivas(plazaId: string): Promise<Asignacion[]> {
  const { data, error } = await supabase.from("asignacion").select("*").eq("plaza_id", plazaId).eq("estatus", "activa");
  if (error) throw error;
  return data ?? [];
}

/**
 * La(s) plaza(s) que ocupa una persona en este momento. Única forma
 * correcta de saber "dónde trabaja" una persona — Persona (CORE 3) nunca
 * tiene esto como campo propio.
 */
export async function obtenerAsignacionesVigentesDePersona(personaId: string): Promise<Asignacion[]> {
  const { data, error } = await supabase.from("asignacion").select("*").eq("persona_id", personaId).eq("estatus", "activa");
  if (error) throw error;
  return data ?? [];
}

export async function obtenerHistorialAsignacionesDePersona(personaId: string): Promise<Asignacion[]> {
  const { data, error } = await supabase
    .from("asignacion")
    .select("*")
    .eq("persona_id", personaId)
    .order("fecha_inicio", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
