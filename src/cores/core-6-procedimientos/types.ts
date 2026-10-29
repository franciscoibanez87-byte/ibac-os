// CORE 6 — Procedimientos
// Refleja 1:1 supabase/migrations/0007_core6_procedimientos.sql
//
// Frontera con CORE 8 (Cumplimiento): este CORE describe el CÓMO
// (los pasos). Demostrar que esos pasos se ejecutaron realmente —
// evidencia, documentos, trazabilidad — es CORE 8, no este.

import type { ObjetoGobernado } from "@/transversal/objeto-gobernado/types";

export interface Procedimiento {
  id: string;
  objeto_gobernado_id: string;
  empresa_id: string;
  nombre: string;
  objetivo: string | null;
  politica_relacionada_id: string | null;
  creado_en: string;
}

export interface ProcedimientoPaso {
  id: string;
  procedimiento_id: string;
  orden: number;
  titulo: string;
  descripcion: string | null;
  responsable_puesto_id: string | null;
  creado_en: string;
}

export interface ProcedimientoCompleto extends Procedimiento {
  objeto_gobernado: ObjetoGobernado;
  pasos: ProcedimientoPaso[];
}
