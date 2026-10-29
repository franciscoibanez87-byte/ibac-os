// Entidad Transversal — EventoMovimiento
// Refleja 1:1 supabase/migrations/0012_transversal_evento_movimiento.sql
//
// Se registra una sola vez por movimiento de capital humano; CORE 1
// (asignacion.evento_movimiento_id), CORE 3 y CORE 4 lo consumen por
// referencia — ninguno debe generar su propia versión del mismo hecho.

export type EventoMovimientoTipo =
  | "alta"
  | "baja"
  | "reingreso"
  | "promocion"
  | "transferencia"
  | "cambio_plaza"
  | "cambio_contractual";

export interface EventoMovimiento {
  id: string;
  empresa_id: string;
  persona_id: string;
  tipo: EventoMovimientoTipo;

  fecha_efectiva: string;
  motivo: string | null;

  /** Una 'alta' no tiene plaza_anterior_id; una 'baja' no tiene plaza_nueva_id (CHECK en BD). */
  plaza_anterior_id: string | null;
  plaza_nueva_id: string | null;
  contrato_anterior_id: string | null;
  contrato_nuevo_id: string | null;

  /** Referencia lógica a persona(id). */
  autorizado_por: string | null;
  creado_en: string;
}
