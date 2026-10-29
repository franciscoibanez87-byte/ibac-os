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

export interface CrearPersonaInput {
  empresaId: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno?: string;
  fechaNacimiento?: string;
  genero?: string;
  curp?: string;
  rfc?: string;
  nss?: string;
  emailPersonal?: string;
  telefono?: string;
  domicilio?: string;
}

export async function crearPersona(input: CrearPersonaInput): Promise<Persona> {
  const { data, error } = await supabase
    .from("persona")
    .insert({
      empresa_id: input.empresaId,
      nombres: input.nombres,
      apellido_paterno: input.apellidoPaterno,
      apellido_materno: input.apellidoMaterno ?? null,
      fecha_nacimiento: input.fechaNacimiento ?? null,
      genero: input.genero ?? null,
      curp: input.curp ?? null,
      rfc: input.rfc ?? null,
      nss: input.nss ?? null,
      email_personal: input.emailPersonal ?? null,
      telefono: input.telefono ?? null,
      domicilio: input.domicilio ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}
