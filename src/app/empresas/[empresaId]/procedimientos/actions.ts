"use server";

import { revalidatePath } from "next/cache";
import { crearNuevoProcedimiento } from "@/cores/core-6-procedimientos/queries";

type ActionState = { error?: string } | undefined;

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

export async function crearProcedimientoAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const empresaId = str(formData, "empresaId");
  const autorId = str(formData, "autorId");
  const nombre = str(formData, "nombre");
  if (!autorId || !nombre) return { error: "Autor y nombre son obligatorios." };

  // Un paso por línea en el textarea — suficiente para el alcance actual.
  const pasosTexto = str(formData, "pasos");
  const pasos = pasosTexto
    .split("\n")
    .map((t) => t.trim())
    .filter(Boolean)
    .map((titulo, i) => ({ orden: i + 1, titulo, descripcion: null, responsable_puesto_id: null }));

  try {
    await crearNuevoProcedimiento({
      empresaId,
      autorId,
      nombre,
      objetivo: str(formData, "objetivo") || undefined,
      pasos,
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "No se pudo crear el procedimiento." };
  }

  revalidatePath(`/empresas/${empresaId}/procedimientos`);
  return undefined;
}
