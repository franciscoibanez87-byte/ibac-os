// CORE 4 — Contratos: lecturas + la única vía soportada para registrar
// un cambio contractual (incluyendo salario).
//
// IMPORTANTE: nunca hacer un `update` directo sobre `salario_pactado` de
// una fila existente. Para cualquier cambio contractual, usar
// `registrarContrato`, que llama a la función de Postgres
// `registrar_contrato` — encuentra el lineage existente de la persona
// automáticamente (vía el objeto_gobernado referenciado) y lo revisa de
// forma atómica, o crea uno nuevo si la persona no tiene contrato previo.

import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import type { Contrato, ContratoJornada, ContratoModalidad, ContratoPeriodicidadPago, ContratoTipo, HistorialSalarialEntry } from "./types";

export async function obtenerContratoVigente(personaId: string): Promise<Contrato | null> {
  const { data: contratos, error } = await supabase.from("contrato").select("*").eq("persona_id", personaId);
  if (error) throw error;
  if (!contratos || contratos.length === 0) return null;

  const { data: objetos, error: errorObjetos } = await supabase
    .from("objeto_gobernado")
    .select("id")
    .in(
      "id",
      contratos.map((c) => c.objeto_gobernado_id)
    )
    .eq("estado", "publicado")
    .is("vigente_hasta", null);
  if (errorObjetos) throw errorObjetos;
  if (!objetos || objetos.length === 0) return null;

  return (contratos.find((c) => c.objeto_gobernado_id === objetos[0].id) as Contrato) ?? null;
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

export interface RegistrarContratoInput {
  personaId: string;
  empresaId: string;
  autorId: string;
  tipoContrato: ContratoTipo;
  modalidad: ContratoModalidad;
  jornadaPactada: ContratoJornada;
  periodicidadPago: ContratoPeriodicidadPago;
  salarioPactado: number;
  moneda?: string;
  condicionesContractuales?: string;
  fechaInicio?: string;
  fechaFin?: string | null;
  /** Obligatorio al revisar un contrato existente (no para el primero). */
  motivoNuevaVersion?: string;
  vigenteDesde?: string;
}

/** Única función soportada para crear o revisar un contrato. */
export async function registrarContrato(input: RegistrarContratoInput): Promise<Contrato> {
  const { data, error } = await supabase.rpc("registrar_contrato", {
    p_persona_id: input.personaId,
    p_empresa_id: input.empresaId,
    p_tipo_contrato: input.tipoContrato,
    p_modalidad: input.modalidad,
    p_jornada_pactada: input.jornadaPactada,
    p_periodicidad_pago: input.periodicidadPago,
    p_salario_pactado: input.salarioPactado,
    p_autor_id: input.autorId,
    p_moneda: input.moneda ?? "MXN",
    p_condiciones_contractuales: input.condicionesContractuales ?? null,
    p_fecha_inicio: input.fechaInicio ?? new Date().toISOString().slice(0, 10),
    p_fecha_fin: input.fechaFin ?? null,
    p_motivo_nueva_version: input.motivoNuevaVersion ?? null,
    p_vigente_desde: input.vigenteDesde ?? new Date().toISOString().slice(0, 10),
  });

  if (error) throw error;
  return data as Contrato;
}
