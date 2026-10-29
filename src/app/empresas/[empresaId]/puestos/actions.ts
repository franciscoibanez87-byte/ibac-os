"use server";

import { revalidatePath } from "next/cache";
import { crearPuesto, registrarBandaSalarial } from "@/cores/core-2-puestos/queries";

type ActionState = { error?: string } | undefined;

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

export async function crearPuestoAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const empresaId = str(formData, "empresaId");
  const nombre = str(formData, "nombre");
  if (!nombre) return { error: "El nombre del puesto es obligatorio." };

  try {
    await crearPuesto({
      empresaId,
      nombre,
      familiaPuesto: str(formData, "familiaPuesto") || undefined,
      nivel: str(formData, "nivel") || undefined,
      objetivoPuesto: str(formData, "objetivoPuesto") || undefined,
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "No se pudo crear el puesto." };
  }

  revalidatePath(`/empresas/${empresaId}/puestos`);
  return undefined;
}

export async function registrarBandaSalarialAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const empresaId = str(formData, "empresaId");
  const puestoId = str(formData, "puestoId");
  const autorId = str(formData, "autorId");
  const salarioMin = Number(str(formData, "salarioMin"));
  const salarioMax = Number(str(formData, "salarioMax"));

  if (!puestoId || !autorId || !salarioMin || !salarioMax) {
    return { error: "Puesto, autor, salario mínimo y máximo son obligatorios." };
  }

  try {
    await registrarBandaSalarial({
      puestoId,
      autorId,
      salarioMin,
      salarioMax,
      salarioMedio: Number(str(formData, "salarioMedio")) || undefined,
      motivoNuevaVersion: str(formData, "motivoNuevaVersion") || undefined,
    });
  } catch (err) {
    // Si el puesto ya tenía una banda vigente, motivoNuevaVersion es
    // obligatorio — el error de la función de Postgres lo deja claro.
    return { error: err instanceof Error ? err.message : "No se pudo registrar la banda salarial." };
  }

  revalidatePath(`/empresas/${empresaId}/puestos`);
  return undefined;
}
