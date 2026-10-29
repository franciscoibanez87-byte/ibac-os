// CORE 2 — Puestos
// Tipos que reflejan 1:1 el esquema de supabase/migrations/0002_core2_puestos.sql
//
// Regla de oro: Puesto define banda salarial de REFERENCIA, nunca el
// salario pactado (eso vive en CORE 4 — Contratos, aún no construido).

export interface Puesto {
  id: string;
  empresa_id: string;
  nombre: string;
  familia_puesto: string | null;
  nivel: string | null;
  descripcion_general: string | null;
  objetivo_puesto: string | null;
  activo: boolean;
  creado_en: string;
  actualizado_en: string;
}

/**
 * Antes llamado "Condiciones". Describe el rol en abstracto — nunca lo
 * pactado con una persona concreta (ver CORE 4 / Contrato).
 */
export interface PuestoCondicionesInherentes {
  id: string;
  puesto_id: string;
  riesgo_exposicion: string | null;
  trabajo_fisico: string | null;
  requiere_viajes: boolean;
  frecuencia_viajes: string | null;
  disponibilidad: string | null;
  entorno: string | null;
  requerimientos_especiales: string | null;
  creado_en: string;
  actualizado_en: string;
}

/**
 * Banda de REFERENCIA, versionada por vigencia. Un puesto no puede tener
 * dos bandas vigentes (vigente_hasta = null) al mismo tiempo.
 */
export interface BandaSalarial {
  id: string;
  puesto_id: string;
  salario_min: number;
  salario_medio: number | null;
  salario_max: number;
  moneda: string;
  vigente_desde: string;
  vigente_hasta: string | null;
  creado_en: string;
}

/**
 * Meta que el puesto fija para un indicador. La definición del indicador
 * y su resultado medido viven en CORE 7 (pendiente); indicador_id es una
 * referencia lógica hasta que esa tabla exista.
 */
export interface KpiPuesto {
  id: string;
  puesto_id: string;
  nombre: string;
  descripcion: string | null;
  meta_valor: number | null;
  meta_unidad: string | null;
  periodicidad: string | null;
  indicador_id: string | null;
  activo: boolean;
  creado_en: string;
  actualizado_en: string;
}

/** Puesto con sus relaciones 1:N/1:1 ya resueltas, para vistas de perfil completo. */
export interface PuestoCompleto extends Puesto {
  condiciones_inherentes: PuestoCondicionesInherentes | null;
  banda_salarial_vigente: BandaSalarial | null;
  kpis: KpiPuesto[];
}
