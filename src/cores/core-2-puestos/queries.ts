// CORE 2 — Puestos: lecturas + registro de bandas salariales.
//
// IMPORTANTE: nunca insertar directamente en `banda_salarial` ni editar su
// vigencia a mano. Usar `registrarBandaSalarial`, que llama a la función
// de Postgres `registrar_banda_salarial` — encuentra automáticamente el
// lineage existente del puesto (si lo hay) y lo revisa, o crea uno nuevo.

import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import type { ObjetoGobernado } from "@/transversal/objeto-gobernado/types";
import type {
  BandaSalarial,
  BandaSalarialConEstado,
  KpiPuesto,
  Puesto,
  PuestoCompleto,
  PuestoCondicionesInherentes,
} from "./types";

export async function listarPuestos(empresaId: string): Promise<Puesto[]> {
  const { data, error } = await supabase
    .from("puesto")
    .select("*")
    .eq("empresa_id", empresaId)
    .eq("activo", true)
    .order("nombre");

  if (error) throw error;
  return data ?? [];
}

export interface CrearPuestoInput {
  empresaId: string;
  nombre: string;
  familiaPuesto?: string;
  nivel?: string;
  descripcionGeneral?: string;
  objetivoPuesto?: string;
}

export async function crearPuesto(input: CrearPuestoInput): Promise<Puesto> {
  const { data, error } = await supabase
    .from("puesto")
    .insert({
      empresa_id: input.empresaId,
      nombre: input.nombre,
      familia_puesto: input.familiaPuesto ?? null,
      nivel: input.nivel ?? null,
      descripcion_general: input.descripcionGeneral ?? null,
      objetivo_puesto: input.objetivoPuesto ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function obtenerBandaVigente(puestoId: string): Promise<BandaSalarialConEstado | null> {
  const { data: bandas, error } = await supabase.from("banda_salarial").select("*").eq("puesto_id", puestoId);
  if (error) throw error;
  if (!bandas || bandas.length === 0) return null;

  const { data: objetos, error: errorObjetos } = await supabase
    .from("objeto_gobernado")
    .select("*")
    .in(
      "id",
      bandas.map((b) => b.objeto_gobernado_id)
    )
    .eq("estado", "publicado")
    .is("vigente_hasta", null);
  if (errorObjetos) throw errorObjetos;
  if (!objetos || objetos.length === 0) return null;

  const objetoVigente = objetos[0] as ObjetoGobernado;
  const banda = bandas.find((b) => b.objeto_gobernado_id === objetoVigente.id) as BandaSalarial;

  return { ...banda, objeto_gobernado: objetoVigente };
}

export async function obtenerPuestoCompleto(puestoId: string): Promise<PuestoCompleto | null> {
  const { data: puesto, error: errorPuesto } = await supabase
    .from("puesto")
    .select("*")
    .eq("id", puestoId)
    .single();

  if (errorPuesto) throw errorPuesto;
  if (!puesto) return null;

  const [{ data: condiciones }, bandaVigente, { data: kpis }] = await Promise.all([
    supabase.from("puesto_condiciones_inherentes").select("*").eq("puesto_id", puestoId).maybeSingle(),
    obtenerBandaVigente(puestoId),
    supabase.from("kpi_puesto").select("*").eq("puesto_id", puestoId).eq("activo", true),
  ]);

  return {
    ...(puesto as Puesto),
    condiciones_inherentes: (condiciones as PuestoCondicionesInherentes) ?? null,
    banda_salarial_vigente: bandaVigente,
    kpis: (kpis as KpiPuesto[]) ?? [],
  };
}

export interface GuardarCondicionesInherentesInput {
  puestoId: string;
  riesgoExposicion?: string;
  trabajoFisico?: string;
  requiereViajes?: boolean;
  frecuenciaViajes?: string;
  disponibilidad?: string;
  entorno?: string;
  requerimientosEspeciales?: string;
}

/**
 * `puesto_condiciones_inherentes.puesto_id` es único — upsert por diseño:
 * no hay versión/historial aquí (a diferencia de banda_salarial), solo la
 * descripción abstracta vigente del rol.
 */
export async function guardarCondicionesInherentes(
  input: GuardarCondicionesInherentesInput
): Promise<PuestoCondicionesInherentes> {
  const { data, error } = await supabase
    .from("puesto_condiciones_inherentes")
    .upsert(
      {
        puesto_id: input.puestoId,
        riesgo_exposicion: input.riesgoExposicion ?? null,
        trabajo_fisico: input.trabajoFisico ?? null,
        requiere_viajes: input.requiereViajes ?? false,
        frecuencia_viajes: input.frecuenciaViajes ?? null,
        disponibilidad: input.disponibilidad ?? null,
        entorno: input.entorno ?? null,
        requerimientos_especiales: input.requerimientosEspeciales ?? null,
        actualizado_en: new Date().toISOString(),
      },
      { onConflict: "puesto_id" }
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}

export interface CrearKpiPuestoInput {
  puestoId: string;
  nombre: string;
  descripcion?: string;
  metaValor?: number;
  metaUnidad?: string;
  periodicidad?: string;
  /** FK lógica a CORE 7 (indicador), opcional. */
  indicadorId?: string;
}

export async function crearKpiPuesto(input: CrearKpiPuestoInput): Promise<KpiPuesto> {
  const { data, error } = await supabase
    .from("kpi_puesto")
    .insert({
      puesto_id: input.puestoId,
      nombre: input.nombre,
      descripcion: input.descripcion ?? null,
      meta_valor: input.metaValor ?? null,
      meta_unidad: input.metaUnidad ?? null,
      periodicidad: input.periodicidad ?? null,
      indicador_id: input.indicadorId ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export interface RegistrarBandaSalarialInput {
  puestoId: string;
  salarioMin: number;
  salarioMax: number;
  autorId: string;
  salarioMedio?: number;
  moneda?: string;
  /** Obligatorio al revisar una banda existente (no para la primera). */
  motivoNuevaVersion?: string;
  vigenteDesde?: string;
}

/** Única vía soportada para crear o revisar una banda salarial. */
export async function registrarBandaSalarial(input: RegistrarBandaSalarialInput): Promise<BandaSalarial> {
  const { data, error } = await supabase.rpc("registrar_banda_salarial", {
    p_puesto_id: input.puestoId,
    p_salario_min: input.salarioMin,
    p_salario_max: input.salarioMax,
    p_autor_id: input.autorId,
    p_salario_medio: input.salarioMedio ?? null,
    p_moneda: input.moneda ?? "MXN",
    p_motivo_nueva_version: input.motivoNuevaVersion ?? null,
    p_vigente_desde: input.vigenteDesde ?? new Date().toISOString().slice(0, 10),
  });

  if (error) throw error;
  return data as BandaSalarial;
}
