// CORE 2 — Puestos: lecturas básicas.
// Solo lectura por ahora — la escritura queda detrás del backend
// (service_role) hasta definir la matriz de permisos por rol.

import { supabase } from "@/lib/supabase";
import type { BandaSalarial, KpiPuesto, Puesto, PuestoCompleto, PuestoCondicionesInherentes } from "./types";

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

export async function obtenerPuestoCompleto(puestoId: string): Promise<PuestoCompleto | null> {
  const { data: puesto, error: errorPuesto } = await supabase
    .from("puesto")
    .select("*")
    .eq("id", puestoId)
    .single();

  if (errorPuesto) throw errorPuesto;
  if (!puesto) return null;

  const [{ data: condiciones }, { data: bandaVigente }, { data: kpis }] = await Promise.all([
    supabase
      .from("puesto_condiciones_inherentes")
      .select("*")
      .eq("puesto_id", puestoId)
      .maybeSingle(),
    supabase
      .from("banda_salarial")
      .select("*")
      .eq("puesto_id", puestoId)
      .is("vigente_hasta", null)
      .maybeSingle(),
    supabase
      .from("kpi_puesto")
      .select("*")
      .eq("puesto_id", puestoId)
      .eq("activo", true),
  ]);

  return {
    ...(puesto as Puesto),
    condiciones_inherentes: (condiciones as PuestoCondicionesInherentes) ?? null,
    banda_salarial_vigente: (bandaVigente as BandaSalarial) ?? null,
    kpis: (kpis as KpiPuesto[]) ?? [],
  };
}
