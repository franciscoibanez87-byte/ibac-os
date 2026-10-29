"use server";

import { revalidatePath } from "next/cache";
import { crearKpiPuesto, guardarCondicionesInherentes } from "@/cores/core-2-puestos/queries";

type ActionState = { error?: string } | undefined;

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

export async function guardarCondicionesAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const empresaId = str(formData, "empresaId");
  const puestoId = str(formData, "puestoId");

  try {
    await guardarCondicionesInherentes({
      puestoId,
      riesgoExposicion: str(formData, "riesgoExposicion") || undefined,
      trabajoFisico: str(formData, "trabajoFisico") || undefined,
      requiereViajes: formData.get("requiereViajes") === "on",
      frecuenciaViajes: str(formData, "frecuenciaViajes") || undefined,
      disponibilidad: str(formData, "disponibilidad") || undefined,
      entorno: str(formData, "entorno") || undefined,
      requerimientosEspeciales: str(formData, "requerimientosEspeciales") || undefined,
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "No se pudieron guardar las condiciones inherentes." };
  }

  revalidatePath(`/empresas/${empresaId}/puestos/${puestoId}`);
  return undefined;
}

export async function crearKpiPuestoAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const empresaId = str(formData, "empresaId");
  const puestoId = str(formData, "puestoId");
  const nombre = str(formData, "nombre");
  if (!nombre) return { error: "El nombre del KPI es obligatorio." };

  try {
    await crearKpiPuesto({
      puestoId,
      nombre,
      metaValor: Number(str(formData, "metaValor")) || undefined,
      metaUnidad: str(formData, "metaUnidad") || undefined,
      periodicidad: str(formData, "periodicidad") || undefined,
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "No se pudo crear el KPI." };
  }

  revalidatePath(`/empresas/${empresaId}/puestos/${puestoId}`);
  return undefined;
}
