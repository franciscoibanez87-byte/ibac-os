// CORE 4 — Contratos
// Refleja 1:1 supabase/migrations/0004_core4_contratos.sql + el refactor
// de 0008 (contrato ahora delega versión/aprobación/vigencia/publicación
// al objeto_gobernado referenciado, en vez de columnas propias).
//
// Fuente ÚNICA de verdad salarial. Nunca editar salario_pactado de una
// fila existente — todo cambio crea una nueva versión vía
// registrarContrato, que resuelve el lineage de la persona automáticamente.

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
  objeto_gobernado_id: string;
  persona_id: string;
  empresa_id: string;

  tipo_contrato: ContratoTipo;
  modalidad: ContratoModalidad;
  jornada_pactada: ContratoJornada;
  periodicidad_pago: ContratoPeriodicidadPago;

  salario_pactado: number;
  moneda: string;

  condiciones_contractuales: string | null;

  fecha_inicio: string;
  fecha_fin: string | null;

  creado_en: string;
}

/** Fila de la vista `historial_salarial` (derivada de contrato + objeto_gobernado). */
export interface HistorialSalarialEntry {
  persona_id: string;
  version: number;
  salario_pactado: number;
  moneda: string;
  vigente_desde: string | null;
  vigente_hasta: string | null;
  motivo_modificacion: string | null;
  es_version_vigente: boolean;
}
