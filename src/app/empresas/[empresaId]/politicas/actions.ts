"use server";

import { revalidatePath } from "next/cache";
import { crearNuevaPolitica, crearNuevaVersionPolitica } from "@/cores/core-5-politicas/queries";

type ActionState = { error?: string } | undefined;

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

export async function crearPoliticaAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const empresaId = str(formData, "empresaId");
  const autorId = str(formData, "autorId");
  const nombre = str(formData, "nombre");
  const cuerpo = str(formData, "cuerpo");
  const objetoLogicoId = str(formData, "objetoLogicoId"); // vacío = política nueva, no revisión

  if (!autorId || !nombre || !cuerpo) {
    return { error: "Autor, nombre y cuerpo son obligatorios." };
  }

  try {
    if (objetoLogicoId) {
      const motivoNuevaVersion = str(formData, "motivoNuevaVersion");
      if (!motivoNuevaVersion) return { error: "El motivo es obligatorio al revisar una política existente." };
      await crearNuevaVersionPolitica({ objetoLogicoId, empresaId, autorId, motivoNuevaVersion, nombre, cuerpo });
    } else {
      await crearNuevaPolitica({ empresaId, autorId, nombre, categoria: str(formData, "categoria") || undefined, cuerpo });
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "No se pudo guardar la política." };
  }

  revalidatePath(`/empresas/${empresaId}/politicas`);
  return undefined;
}
