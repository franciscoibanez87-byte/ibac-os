// CORE 7 — Indicadores: lecturas y registro de resultados medidos.
//
// No existe función atómica de Postgres para esto porque `indicador` y
// `resultado_indicador` no tienen ciclo de vida versionado (a diferencia
// de CORE 2/4/5/6) — son inserciones directas con una restricción de
// unicidad por período (`uq_resultado_indicador_periodo`) que ya hace de
// guarda contra duplicados.

import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import type { Indicador, KpiPuestoResultadoReciente, ResultadoIndicador } from "./types";

export async function listarIndicadores(empresaId: string): Promise<Indicador[]> {
  const { data, error } = await supabase
    .from("indicador")
    .select("*")
    .eq("empresa_id", empresaId)
    .eq("activo", true)
    .order("nombre");
  if (error) throw error;
  return data ?? [];
}

export async function obtenerIndicador(id: string): Promise<Indicador | null> {
  const { data, error } = await supabase.from("indicador").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export interface CrearIndicadorInput {
  empresaId: string;
  nombre: string;
  descripcion?: string;
  unidadMedida?: string;
  periodicidad?: string;
  metodoCalculo?: string;
}

export async function crearIndicador(input: CrearIndicadorInput): Promise<Indicador> {
  const { data, error } = await supabase
    .from("indicador")
    .insert({
      empresa_id: input.empresaId,
      nombre: input.nombre,
      descripcion: input.descripcion ?? null,
      unidad_medida: input.unidadMedida ?? null,
      periodicidad: input.periodicidad ?? null,
      metodo_calculo: input.metodoCalculo ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function obtenerResultados(indicadorId: string): Promise<ResultadoIndicador[]> {
  const { data, error } = await supabase
    .from("resultado_indicador")
    .select("*")
    .eq("indicador_id", indicadorId)
    .order("periodo_fin", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export interface RegistrarResultadoInput {
  indicadorId: string;
  periodoInicio: string;
  periodoFin: string;
  valor: number;
  /** Referencia lógica a persona(id); omitir si fue un cálculo automatizado. */
  calculadoPor?: string;
  notas?: string;
}

/** Falla con error de unicidad si ya existe un resultado para ese período. */
export async function registrarResultado(input: RegistrarResultadoInput): Promise<ResultadoIndicador> {
  const { data, error } = await supabase
    .from("resultado_indicador")
    .insert({
      indicador_id: input.indicadorId,
      periodo_inicio: input.periodoInicio,
      periodo_fin: input.periodoFin,
      valor: input.valor,
      calculado_por: input.calculadoPor ?? null,
      notas: input.notas ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Último resultado medido por cada KPI de puesto, comparado contra su meta. */
export async function obtenerResultadosRecientesPorPuesto(puestoId: string): Promise<KpiPuestoResultadoReciente[]> {
  const { data, error } = await supabase.from("kpi_puesto_resultado_reciente").select("*").eq("puesto_id", puestoId);
  if (error) throw error;
  return data ?? [];
}
