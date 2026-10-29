// CORE 6 — Procedimientos: lecturas + creación.

import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { crearVersionObjetoGobernado } from "@/transversal/objeto-gobernado/queries";
import type { ObjetoGobernado } from "@/transversal/objeto-gobernado/types";
import type { Procedimiento, ProcedimientoCompleto, ProcedimientoPaso } from "./types";

export async function obtenerProcedimientoCompleto(procedimientoId: string): Promise<ProcedimientoCompleto | null> {
  const { data: procedimiento, error: errorProcedimiento } = await supabase
    .from("procedimiento")
    .select("*")
    .eq("id", procedimientoId)
    .maybeSingle();
  if (errorProcedimiento) throw errorProcedimiento;
  if (!procedimiento) return null;

  const [{ data: objetoGobernado, error: errorObjeto }, { data: pasos, error: errorPasos }] = await Promise.all([
    supabase.from("objeto_gobernado").select("*").eq("id", procedimiento.objeto_gobernado_id).single(),
    supabase.from("procedimiento_paso").select("*").eq("procedimiento_id", procedimientoId).order("orden"),
  ]);
  if (errorObjeto) throw errorObjeto;
  if (errorPasos) throw errorPasos;

  return {
    ...(procedimiento as Procedimiento),
    objeto_gobernado: objetoGobernado as ObjetoGobernado,
    pasos: (pasos as ProcedimientoPaso[]) ?? [],
  };
}

export interface NuevoProcedimientoInput {
  empresaId: string;
  autorId: string;
  nombre: string;
  objetivo?: string;
  politicaRelacionadaId?: string;
  pasos: Array<Pick<ProcedimientoPaso, "orden" | "titulo" | "descripcion" | "responsable_puesto_id">>;
}

/** Crea un procedimiento nuevo (v1, borrador) con sus pasos. Luego hay que aprobarlo y publicarlo. */
export async function crearNuevoProcedimiento(input: NuevoProcedimientoInput): Promise<ProcedimientoCompleto> {
  const objetoGobernado = await crearVersionObjetoGobernado({
    tipoObjeto: "procedimiento",
    autorId: input.autorId,
  });

  const { data: procedimiento, error } = await supabase
    .from("procedimiento")
    .insert({
      objeto_gobernado_id: objetoGobernado.id,
      empresa_id: input.empresaId,
      nombre: input.nombre,
      objetivo: input.objetivo ?? null,
      politica_relacionada_id: input.politicaRelacionadaId ?? null,
    })
    .select()
    .single();
  if (error) throw error;

  let pasosInsertados: ProcedimientoPaso[] = [];
  if (input.pasos.length > 0) {
    const { data: pasos, error: errorPasos } = await supabase
      .from("procedimiento_paso")
      .insert(input.pasos.map((p) => ({ ...p, procedimiento_id: procedimiento.id })))
      .select();
    if (errorPasos) throw errorPasos;
    pasosInsertados = pasos ?? [];
  }

  return {
    ...(procedimiento as Procedimiento),
    objeto_gobernado: objetoGobernado,
    pasos: pasosInsertados,
  };
}
