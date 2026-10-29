// Entidad Transversal — EventoMovimiento: registro y consulta.
//
// No hay una función atómica de Postgres para crearlo porque no tiene
// ciclo de versionado — es un hecho que se registra una sola vez. Los
// CHECK constraints de la tabla (chk_evento_movimiento_alta/baja) ya
// impiden combinaciones inválidas de plaza_anterior_id/plaza_nueva_id
// según el tipo.

import { supabase } from "@/lib/supabase";
import type { EventoMovimiento, EventoMovimientoTipo } from "./types";

export interface RegistrarEventoMovimientoInput {
  empresaId: string;
  personaId: string;
  tipo: EventoMovimientoTipo;
  fechaEfectiva: string;
  motivo?: string;
  plazaAnteriorId?: string;
  plazaNuevaId?: string;
  contratoAnteriorId?: string;
  contratoNuevoId?: string;
  /** Referencia lógica a persona(id). */
  autorizadoPor?: string;
}

/** Única vía soportada para registrar un movimiento de capital humano. */
export async function registrarEventoMovimiento(input: RegistrarEventoMovimientoInput): Promise<EventoMovimiento> {
  const { data, error } = await supabase
    .from("evento_movimiento")
    .insert({
      empresa_id: input.empresaId,
      persona_id: input.personaId,
      tipo: input.tipo,
      fecha_efectiva: input.fechaEfectiva,
      motivo: input.motivo ?? null,
      plaza_anterior_id: input.plazaAnteriorId ?? null,
      plaza_nueva_id: input.plazaNuevaId ?? null,
      contrato_anterior_id: input.contratoAnteriorId ?? null,
      contrato_nuevo_id: input.contratoNuevoId ?? null,
      autorizado_por: input.autorizadoPor ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function obtenerHistorialMovimientos(personaId: string): Promise<EventoMovimiento[]> {
  const { data, error } = await supabase
    .from("evento_movimiento")
    .select("*")
    .eq("persona_id", personaId)
    .order("fecha_efectiva", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function obtenerMovimientosPorTipo(empresaId: string, tipo: EventoMovimientoTipo): Promise<EventoMovimiento[]> {
  const { data, error } = await supabase
    .from("evento_movimiento")
    .select("*")
    .eq("empresa_id", empresaId)
    .eq("tipo", tipo)
    .order("fecha_efectiva", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
