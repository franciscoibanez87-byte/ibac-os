// CORE 8 — Cumplimiento
// Refleja 1:1 supabase/migrations/0010_core8_cumplimiento.sql
//
// Frontera con CORE 6 (Procedimientos): Procedimiento = CÓMO se ejecuta;
// Cumplimiento = DEMOSTRAR que se cumplió.
//
// Cadena de control: REQUERIMIENTO (ObligacionCumplimiento) → RESPONSABLE
// → FECHA → ACCIÓN → EVIDENCIA → ESTATUS → RIESGO, normalizada en
// CumplimientoInstancia (una ocurrencia concreta por período).
//
// Decisión de diseño: estas entidades NO usan el Motor de Objeto
// Gobernado — son registros operativos de seguimiento, no documentos
// normativos versionados.

export type CumplimientoRiesgoNivel = "bajo" | "medio" | "alto" | "critico";
export type CumplimientoEstatus = "pendiente" | "en_proceso" | "cumplido" | "vencido" | "no_aplica";
export type EvidenciaAsistenciaTipo = "entrada" | "salida" | "retardo" | "falta" | "incapacidad" | "vacaciones" | "permiso";

/** El REQUERIMIENTO permanente. */
export interface ObligacionCumplimiento {
  id: string;
  empresa_id: string;
  nombre: string;
  descripcion: string | null;
  categoria: string | null;
  /** 'unica' | 'mensual' | 'trimestral' | 'semestral' | 'anual' */
  periodicidad: string;
  responsable_default_puesto_id: string | null;
  /** Riesgo de NO cumplir, en abstracto (no el de una ocurrencia concreta). */
  riesgo_nivel_inherente: CumplimientoRiesgoNivel;
  activa: boolean;
  creado_en: string;
  actualizado_en: string;
}

/** Qué documentos exige la obligación (la exigencia, no la evidencia entregada). */
export interface DocumentoRequerido {
  id: string;
  obligacion_id: string;
  nombre: string;
  descripcion: string | null;
  obligatorio: boolean;
  creado_en: string;
}

/** Una ocurrencia concreta de una obligación, con la cadena de control completa. */
export interface CumplimientoInstancia {
  id: string;
  obligacion_id: string; // REQUERIMIENTO

  periodo_inicio: string;
  periodo_fin: string;
  fecha_limite: string; // FECHA

  responsable_persona_id: string | null; // RESPONSABLE

  accion_realizada: string | null; // ACCIÓN
  fecha_accion: string | null;

  /** Referencia lógica a la Gestión Documental transversal (aún no construida). */
  evidencia_documento_id: string | null; // EVIDENCIA

  estatus: CumplimientoEstatus; // ESTATUS

  riesgo_nivel: CumplimientoRiesgoNivel; // RIESGO — puede escalar respecto al inherente
  riesgo_descripcion: string | null;

  creado_en: string;
  actualizado_en: string;
}

/** Evidencia de asistencia/incapacidades. No hay reloj checador integrado aún (ver `fuente`). */
export interface EvidenciaAsistencia {
  id: string;
  persona_id: string;
  fecha: string;
  tipo_evento: EvidenciaAsistenciaTipo;
  hora_entrada: string | null;
  hora_salida: string | null;
  justificacion: string | null;
  evidencia_documento_id: string | null;
  /** 'manual' | 'importado' | futuro: 'reloj_checador' */
  fuente: string;
  /** Para incapacidad/vacaciones/permiso que abarcan un rango. */
  vigencia_periodo_inicio: string | null;
  vigencia_periodo_fin: string | null;
  creado_en: string;
}

export interface AlertaCumplimiento {
  id: string;
  empresa_id: string;
  cumplimiento_instancia_id: string | null;
  tipo: string; // 'proximidad_vencimiento' | 'vencido' | 'riesgo_alto' | ...
  mensaje: string;
  fecha_generada: string;
  atendida: boolean;
  fecha_atendida: string | null;
  /** Referencia lógica a persona(id). */
  atendida_por: string | null;
}
