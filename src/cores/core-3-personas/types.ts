// CORE 3 — Personas / Expedientes
// Refleja 1:1 supabase/migrations/0003_core3_personas.sql
//
// Regla de oro: Persona NUNCA tiene salario como dato propio. El
// historial salarial se lee de la vista `historial_salarial`
// (ver src/cores/core-4-contratos/queries.ts), que deriva de CORE 4.

export type PersonaEstatus = "activo" | "baja" | "baja_temporal";

export interface Persona {
  id: string;
  empresa_id: string;

  nombres: string;
  apellido_paterno: string;
  apellido_materno: string | null;
  fecha_nacimiento: string | null;
  genero: string | null;

  curp: string | null;
  rfc: string | null;
  nss: string | null;

  email_personal: string | null;
  telefono: string | null;
  domicilio: string | null;

  /**
   * Estatus del EXPEDIENTE, no de la ocupación de una plaza. La ocupación
   * actual (qué plaza, si tiene una vigente) se deriva de CORE 1
   * (asignacion), nunca se duplica aquí.
   */
  estatus: PersonaEstatus;

  creado_en: string;
  actualizado_en: string;
}

export function nombreCompleto(p: Pick<Persona, "nombres" | "apellido_paterno" | "apellido_materno">): string {
  return [p.nombres, p.apellido_paterno, p.apellido_materno].filter(Boolean).join(" ");
}
