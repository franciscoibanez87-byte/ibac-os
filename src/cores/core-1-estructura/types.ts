// CORE 1 — Estructura Organizacional
// Refleja 1:1 supabase/migrations/0001_core1_estructura.sql + las FKs
// conectadas después desde CORE 2 (puesto), CORE 3 (persona) y el
// transversal EventoMovimiento (0012).
//
// Regla de oro: Asignación es la ÚNICA fuente de verdad de ocupación
// Persona↔Plaza↔Vigencia. Persona (CORE 3) nunca tiene plaza/puesto como
// campo propio — se deriva siempre leyendo la Asignación vigente.

export type UnidadOrganizacionalTipo = "direccion" | "area" | "jefatura";
export type PlazaEstado = "autorizada" | "ocupada" | "vacante" | "congelada" | "eliminada";
export type AsignacionTipo = "titular" | "interino" | "cobertura_temporal" | "doble_funcion";
export type AsignacionEstatus = "activa" | "finalizada" | "cancelada";

export interface Empresa {
  id: string;
  razon_social: string;
  rfc: string | null;
  nombre_comercial: string | null;
  activa: boolean;
  creado_en: string;
  actualizado_en: string;
}

export interface Sede {
  id: string;
  empresa_id: string;
  nombre: string;
  direccion: string | null;
  ciudad: string | null;
  estado: string | null;
  activa: boolean;
  creado_en: string;
  actualizado_en: string;
}

/** Árbol auto-referenciado Dirección/Área/Jefatura. `tipo` indica el nivel. */
export interface UnidadOrganizacional {
  id: string;
  empresa_id: string;
  sede_id: string | null;
  tipo: UnidadOrganizacionalTipo;
  nombre: string;
  unidad_padre_id: string | null;
  activa: boolean;
  creado_en: string;
  actualizado_en: string;
}

/** Posición autorizada. Puede existir sin ocupante. */
export interface Plaza {
  id: string;
  empresa_id: string;
  unidad_organizacional_id: string;
  puesto_id: string | null;
  plaza_jefe_inmediato_id: string | null;
  codigo: string | null;
  estado: PlazaEstado;
  fecha_autorizacion: string;
  creado_en: string;
  actualizado_en: string;
}

/**
 * Persona ↔ Plaza ↔ Vigencia. ÚNICA fuente de verdad de quién ocupa qué
 * plaza y cuándo. `evento_movimiento_id` es opcional: no toda asignación
 * nace de un movimiento registrado explícitamente (ver transversal/eventos).
 */
export interface Asignacion {
  id: string;
  plaza_id: string;
  persona_id: string;
  tipo: AsignacionTipo;
  estatus: AsignacionEstatus;
  fecha_inicio: string;
  fecha_fin: string | null;
  motivo_cambio: string | null;
  evento_movimiento_id: string | null;
  creado_en: string;
  actualizado_en: string;
}
