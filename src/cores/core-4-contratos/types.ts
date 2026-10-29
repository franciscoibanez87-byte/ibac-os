// CORE 4 — Contratos
// Refleja 1:1 supabase/migrations/0004_core4_contratos.sql
//
// Fuente ÚNICA de verdad salarial. Nunca editar salario_pactado de una
// versión existente — todo cambio crea una nueva fila con version + 1.

export type ContratoTipo =
  | "indeterminado"
  | "determinado"
  | "por_obra"
  | "periodo_prueba"
  | "capacitacion_inicial";

export type ContratoModalidad = "presencial" | "remoto" | "hibrido";
export type ContratoJornada = "diurna" | "nocturna" | "mixta" | "por_hora";
export type ContratoPeriodicidadPago = "semanal" | "quincenal" | "mensual";

export interface Contrato {
  id: string;
  persona_id: string;
  empresa_id: string;

  version: number;
  motivo_modificacion: string | null;

  tipo_contrato: ContratoTipo;
  modalidad: ContratoModalidad;
  jornada_pactada: ContratoJornada;
  periodicidad_pago: ContratoPeriodicidadPago;

  salario_pactado: number;
  moneda: string;

  condiciones_contractuales: string | null;

  fecha_inicio: string;
  fecha_fin: string | null;

  vigente_desde: string;
  vigente_hasta: string | null;

  creado_en: string;
}

/** Fila de la vista `historial_salarial` (derivada de `contrato`). */
export interface HistorialSalarialEntry {
  persona_id: string;
  version: number;
  salario_pactado: number;
  moneda: string;
  vigente_desde: string;
  vigente_hasta: string | null;
  motivo_modificacion: string | null;
  es_version_vigente: boolean;
}
