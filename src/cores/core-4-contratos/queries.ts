// CORE 4 — Contratos: lecturas + la única vía soportada para registrar
// un cambio contractual (incluyendo salario).
//
// IMPORTANTE: nunca hacer un `update` directo sobre `salario_pactado` de
// una fila existente. Para cualquier cambio contractual (incluido un
// aumento de sueldo), usar `registrarNuevaVersionContrato`, que llama a
// la función de Postgres `registrar_nueva_version_contrato` y cierra +
// abre versión de forma atómica.

import { supabase } from "@/lib/supabase";
import type { Contrato, HistorialSalarialEntry } from "./types";

export async function obtenerContratoVigente(personaId: string): Promise<Contrato | null> {
  const { data, error } = await supabase
    .from("contrato")
    .select("*")
    .eq("persona_id", personaId)
    .is("vigente_hasta", null)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function obtenerHistorialSalarial(personaId: string): Promise<HistorialSalarialEntry[]> {
  const { data, error } = await supabase
    .from("historial_salarial")
    .select("*")
    .eq("persona_id", personaId)
    .order("version");

  if (error) throw error;
  return data ?? [];
}

export interface NuevaVersionContratoInput {
  personaId: string;
  empresaId: string;
  motivoModificacion: string; // obligatorio — ver CHECK en la tabla
  tipoContrato: Contrato["tipo_contrato"];
  modalidad: Contrato["modalidad"];
  jornadaPactada: Contrato["jornada_pactada"];
  periodicidadPago: Contrato["periodicidad_pago"];
  salarioPactado: number;
  moneda?: string;
  condicionesContractuales?: string;
  fechaInicio: string;
  fechaFin?: string | null;
  vigenteDesde: string;
}

/**
 * Única función soportada para cambiar un contrato. Cierra la versión
 * vigente actual (si existe) y crea la siguiente, de forma atómica, vía
 * la función de Postgres `registrar_nueva_version_contrato`.
 */
export async function registrarNuevaVersionContrato(input: NuevaVersionContratoInput): Promise<Contrato> {
  const { data, error } = await supabase.rpc("registrar_nueva_version_contrato", {
    p_persona_id: input.personaId,
    p_empresa_id: input.empresaId,
    p_motivo_modificacion: input.motivoModificacion,
    p_tipo_contrato: input.tipoContrato,
    p_modalidad: input.modalidad,
    p_jornada_pactada: input.jornadaPactada,
    p_periodicidad_pago: input.periodicidadPago,
    p_salario_pactado: input.salarioPactado,
    p_moneda: input.moneda ?? "MXN",
    p_condiciones_contractuales: input.condicionesContractuales ?? null,
    p_fecha_inicio: input.fechaInicio,
    p_fecha_fin: input.fechaFin ?? null,
    p_vigente_desde: input.vigenteDesde,
  });

  if (error) throw error;
  return data as Contrato;
}
