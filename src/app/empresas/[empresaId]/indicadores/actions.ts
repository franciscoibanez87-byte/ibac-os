"use server";

import { revalidatePath } from "next/cache";
import { crearIndicador, registrarResultado } from "@/cores/core-7-indicadores/queries";

type ActionState = { error?: string } | undefined;

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

export async function crearIndicadorAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const empresaId = str(formData, "empresaId");
  const nombre = str(formData, "nombre");
  if (!nombre) return { error: "El nombre del indicador es obligatorio." };

  try {
    await crearIndicador({
      empresaId,
      nombre,
      unidadMedida: str(formData, "unidadMedida") || undefined,
      periodicidad: str(formData, "periodicidad") || undefined,
      metodoCalculo: str(formData, "metodoCalculo") || undefined,
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "No se pudo crear el indicador." };
  }

  revalidatePath(`/empresas/${empresaId}/indicadores`);
  return undefined;
}

export async function registrarResultadoAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const empresaId = str(formData, "empresaId");
  const indicadorId = str(formData, "indicadorId");
  const periodoInicio = str(formData, "periodoInicio");
  const periodoFin = str(formData, "periodoFin");
  const valor = Number(str(formData, "valor"));

  if (!indicadorId || !periodoInicio || !periodoFin || Number.isNaN(valor)) {
    return { error: "Indicador, período y valor son obligatorios." };
  }

  try {
    await registrarResultado({ indicadorId, periodoInicio, periodoFin, valor, notas: str(formData, "notas") || undefined });
  } catch (err) {
    // uq_resultado_indicador_periodo es la causa más probable: ya existe
    // un resultado para ese indicador y período.
    return { error: err instanceof Error ? err.message : "No se pudo registrar el resultado." };
  }

  revalidatePath(`/empresas/${empresaId}/indicadores`);
  return undefined;
}
