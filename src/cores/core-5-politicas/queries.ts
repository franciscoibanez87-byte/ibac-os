// CORE 5 — Políticas: lecturas + creación de versiones.
//
// Nota de implementación: el join politica -> objeto_gobernado se resuelve
// aquí con dos consultas y un merge en JS, en vez de depender del
// embedding automático de PostgREST sobre la FK compuesta
// (objeto_gobernado_id, tipo_objeto). Es más verboso pero no depende de
// que PostgREST infiera correctamente una relación sobre una FK compuesta.

import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { crearVersionObjetoGobernado } from "@/transversal/objeto-gobernado/queries";
import type { ObjetoGobernado } from "@/transversal/objeto-gobernado/types";
import type { Politica, PoliticaConEstado } from "./types";

async function resolverEstado(politicas: Politica[]): Promise<PoliticaConEstado[]> {
  if (politicas.length === 0) return [];

  const ids = politicas.map((p) => p.objeto_gobernado_id);
  const { data: objetos, error } = await supabase.from("objeto_gobernado").select("*").in("id", ids);
  if (error) throw error;

  const porId = new Map((objetos ?? []).map((o) => [o.id, o as ObjetoGobernado]));

  return politicas.map((p) => ({ ...p, objeto_gobernado: porId.get(p.objeto_gobernado_id)! }));
}

/** Solo las versiones actualmente publicadas y vigentes. */
export async function listarPoliticasVigentes(empresaId: string): Promise<PoliticaConEstado[]> {
  const { data: politicas, error } = await supabase.from("politica").select("*").eq("empresa_id", empresaId);
  if (error) throw error;

  const resueltas = await resolverEstado(politicas ?? []);
  return resueltas.filter((p) => p.objeto_gobernado.estado === "publicado" && p.objeto_gobernado.vigente_hasta === null);
}

/** Todas las versiones (cualquier estado) de la empresa, para administrar el ciclo de vida. */
export async function listarTodasLasPoliticas(empresaId: string): Promise<PoliticaConEstado[]> {
  const { data: politicas, error } = await supabase.from("politica").select("*").eq("empresa_id", empresaId);
  if (error) throw error;
  return resolverEstado(politicas ?? []);
}

/** Todas las versiones (cualquier estado) de una política lógica, para ver su historial. */
export async function listarVersionesDePolitica(objetoLogicoId: string): Promise<PoliticaConEstado[]> {
  const { data: objetos, error: errorObjetos } = await supabase
    .from("objeto_gobernado")
    .select("*")
    .eq("objeto_logico_id", objetoLogicoId)
    .eq("tipo_objeto", "politica")
    .order("version");
  if (errorObjetos) throw errorObjetos;

  const ids = (objetos ?? []).map((o) => o.id);
  if (ids.length === 0) return [];

  const { data: politicas, error: errorPoliticas } = await supabase.from("politica").select("*").in("objeto_gobernado_id", ids);
  if (errorPoliticas) throw errorPoliticas;

  const porObjetoGobernadoId = new Map((politicas ?? []).map((p) => [p.objeto_gobernado_id, p as Politica]));

  return (objetos as ObjetoGobernado[]).map((o) => ({
    ...porObjetoGobernadoId.get(o.id)!,
    objeto_gobernado: o,
  }));
}

export interface NuevaPoliticaInput {
  empresaId: string;
  autorId: string;
  nombre: string;
  categoria?: string;
  cuerpo: string;
}

/** Crea una política nueva (v1, borrador). Luego hay que aprobarla y publicarla. */
export async function crearNuevaPolitica(input: NuevaPoliticaInput): Promise<PoliticaConEstado> {
  const objetoGobernado = await crearVersionObjetoGobernado({
    tipoObjeto: "politica",
    autorId: input.autorId,
  });

  const { data, error } = await supabase
    .from("politica")
    .insert({
      objeto_gobernado_id: objetoGobernado.id,
      empresa_id: input.empresaId,
      nombre: input.nombre,
      categoria: input.categoria ?? null,
      cuerpo: input.cuerpo,
    })
    .select()
    .single();

  if (error) throw error;
  return { ...(data as Politica), objeto_gobernado: objetoGobernado };
}

export interface NuevaVersionPoliticaInput {
  objetoLogicoId: string;
  empresaId: string;
  autorId: string;
  motivoNuevaVersion: string;
  nombre: string;
  categoria?: string;
  cuerpo: string;
}

/** Crea una nueva versión (borrador) de una política existente. */
export async function crearNuevaVersionPolitica(input: NuevaVersionPoliticaInput): Promise<PoliticaConEstado> {
  const objetoGobernado = await crearVersionObjetoGobernado({
    tipoObjeto: "politica",
    autorId: input.autorId,
    objetoLogicoId: input.objetoLogicoId,
    motivoNuevaVersion: input.motivoNuevaVersion,
  });

  const { data, error } = await supabase
    .from("politica")
    .insert({
      objeto_gobernado_id: objetoGobernado.id,
      empresa_id: input.empresaId,
      nombre: input.nombre,
      categoria: input.categoria ?? null,
      cuerpo: input.cuerpo,
    })
    .select()
    .single();

  if (error) throw error;
  return { ...(data as Politica), objeto_gobernado: objetoGobernado };
}
