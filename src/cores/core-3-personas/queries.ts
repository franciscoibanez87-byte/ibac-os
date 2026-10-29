// CORE 3 — Personas / Expedientes: lecturas básicas.
//
// Nota deliberada: NO hay aquí ninguna función "obtenerSalario" ni campo
// de salario en los tipos de Persona. Para el salario actual o histórico
// de una persona, usar core-4-contratos (obtenerContratoVigente /
// obtenerHistorialSalarial). Mezclar esa lógica aquí reintroduciría el
// problema de ownership que la corrección de arquitectura eliminó.

import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import type { Persona, PersonaEstatus } from "./types";

export async function listarPersonas(
  empresaId: string,
  estatus: PersonaEstatus = "activo"
): Promise<Persona[]> {
  const { data, error } = await supabase
    .from("persona")
    .select("*")
    .eq("empresa_id", empresaId)
    .eq("estatus", estatus)
    .order("apellido_paterno");

  if (error) throw error;
  return data ?? [];
}

export async function obtenerPersona(personaId: string): Promise<Persona | null> {
  const { data, error } = await supabase
    .from("persona")
    .select("*")
    .eq("id", personaId)
    .maybeSingle();

  if (error) throw error;
  return data;
}
