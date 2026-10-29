// CORE 7 — Indicadores
// Refleja 1:1 supabase/migrations/0009_core7_indicadores.sql
//
// Regla de oro: Indicador ≠ Meta específica del Puesto ≠ Resultado.
// - `Indicador`            = definición general (aquí).
// - `KpiPuesto` (CORE 2)   = la META que un puesto en particular fija.
// - `ResultadoIndicador`   = el RESULTADO medido para un período (aquí).
// Nunca fusionar estas tres entidades.

export interface Indicador {
  id: string;
  empresa_id: string;
  nombre: string;
  descripcion: string | null;
  unidad_medida: string | null;
  periodicidad: string | null;
  metodo_calculo: string | null;
  activo: boolean;
  creado_en: string;
  actualizado_en: string;
}

export interface ResultadoIndicador {
  id: string;
  indicador_id: string;
  periodo_inicio: string;
  periodo_fin: string;
  valor: number;
  fecha_calculo: string;
  /** Referencia lógica a persona(id); null si fue un cálculo automatizado. */
  calculado_por: string | null;
  notas: string | null;
  creado_en: string;
}

/** Fila de la vista `kpi_puesto_resultado_reciente` (CORE 2 + CORE 7). */
export interface KpiPuestoResultadoReciente {
  kpi_puesto_id: string;
  puesto_id: string;
  kpi_nombre: string;
  meta_valor: number | null;
  meta_unidad: string | null;
  resultado_id: string | null;
  resultado_valor: number | null;
  periodo_inicio: string | null;
  periodo_fin: string | null;
}
