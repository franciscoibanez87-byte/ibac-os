// CORE 5 — Políticas
// Refleja 1:1 supabase/migrations/0006_core5_politicas.sql
//
// El ciclo de vida (versión/aprobación/vigencia/publicación) vive en el
// objeto_gobernado referenciado — ver src/transversal/objeto-gobernado.
// Esta tabla solo guarda el contenido propio de cada versión.

import type { ObjetoGobernado } from "@/transversal/objeto-gobernado/types";

export interface Politica {
  id: string;
  objeto_gobernado_id: string;
  empresa_id: string;
  nombre: string;
  categoria: string | null;
  cuerpo: string;
  creado_en: string;
}

/** Una versión de política con su objeto_gobernado ya resuelto (para mostrar estado/vigencia). */
export interface PoliticaConEstado extends Politica {
  objeto_gobernado: ObjetoGobernado;
}
