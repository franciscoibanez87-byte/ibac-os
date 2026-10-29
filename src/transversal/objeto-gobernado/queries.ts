// Servicio transversal — Motor de Objeto Gobernado: las únicas funciones
// soportadas para mover un objeto por su ciclo de vida. Nunca hacer
// `update` directo de `estado`/`vigente_desde`/`vigente_hasta` desde el
// cliente — siempre pasar por estas RPC, que llaman a las funciones de
// Postgres correspondientes (ver 0005_transversal_objeto_gobernado.sql).

import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import type { ObjetoGobernado, ObjetoGobernadoTipo } from "./types";

export interface CrearVersionInput {
  tipoObjeto: ObjetoGobernadoTipo;
  autorId: string;
  /** Omitir para crear un objeto lógico nuevo (v1). Pasar para crear una nueva versión de uno existente (requiere motivo). */
  objetoLogicoId?: string;
  /** Obligatorio si se pasa objetoLogicoId (v2 en adelante). */
  motivoNuevaVersion?: string;
}

export async function crearVersionObjetoGobernado(input: CrearVersionInput): Promise<ObjetoGobernado> {
  const { data, error } = await supabase.rpc("crear_version_objeto_gobernado", {
    p_tipo_objeto: input.tipoObjeto,
    p_autor_id: input.autorId,
    p_objeto_logico_id: input.objetoLogicoId ?? null,
    p_motivo_nueva_version: input.motivoNuevaVersion ?? null,
  });
  if (error) throw error;
  return data as ObjetoGobernado;
}

export async function aprobarObjetoGobernado(id: string, aprobadoPor: string): Promise<ObjetoGobernado> {
  const { data, error } = await supabase.rpc("aprobar_objeto_gobernado", {
    p_id: id,
    p_aprobado_por: aprobadoPor,
  });
  if (error) throw error;
  return data as ObjetoGobernado;
}

export async function publicarObjetoGobernado(id: string, vigenteDesde?: string): Promise<ObjetoGobernado> {
  const { data, error } = await supabase.rpc("publicar_objeto_gobernado", {
    p_id: id,
    p_vigente_desde: vigenteDesde ?? new Date().toISOString().slice(0, 10),
  });
  if (error) throw error;
  return data as ObjetoGobernado;
}

export async function archivarObjetoGobernado(id: string, vigenteHasta?: string): Promise<ObjetoGobernado> {
  const { data, error } = await supabase.rpc("archivar_objeto_gobernado", {
    p_id: id,
    p_vigente_hasta: vigenteHasta ?? new Date().toISOString().slice(0, 10),
  });
  if (error) throw error;
  return data as ObjetoGobernado;
}

/** Todas las versiones (vigentes, archivadas, en borrador) de un objeto lógico, ordenadas. */
export async function listarVersiones(objetoLogicoId: string): Promise<ObjetoGobernado[]> {
  const { data, error } = await supabase
    .from("objeto_gobernado")
    .select("*")
    .eq("objeto_logico_id", objetoLogicoId)
    .order("version");

  if (error) throw error;
  return data ?? [];
}
