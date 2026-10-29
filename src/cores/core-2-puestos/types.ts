// CORE 2 — Puestos
// Refleja 1:1 supabase/migrations/0002_core2_puestos.sql + el refactor
// de 0008 (banda_salarial ahora delega versión/vigencia al
// objeto_gobernado referenciado — ver src/transversal/objeto-gobernado).
//
// Regla de oro: Puesto define banda salarial de REFERENCIA, nunca el
// salario pactado (eso vive en CORE 4 — Contratos).

import type { ObjetoGobernado } from "@/transversal/objeto-gobernado/types";

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
 * Banda de REFERENCIA. Versión/aprobación/vigencia/publicación viven en
 * el objeto_gobernado referenciado (objeto_gobernado_id), no en columnas
 * propias de esta tabla — se gestiona vía registrarBandaSalarial.
 */
export interface BandaSalarial {
  id: string;
  objeto_gobernado_id: string;
  puesto_id: string;
  salario_min: number;
  salario_medio: number | null;
  salario_max: number;
  moneda: string;
  creado_en: string;
}

export interface BandaSalarialConEstado extends BandaSalarial {
  objeto_gobernado: ObjetoGobernado;
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
  banda_salarial_vigente: BandaSalarialConEstado | null;
  kpis: KpiPuesto[];
}
