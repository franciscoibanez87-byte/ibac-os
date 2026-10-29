"use server";

import { revalidatePath } from "next/cache";
import { crearPersona } from "@/cores/core-3-personas/queries";

type ActionState = { error?: string } | undefined;

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

export async function crearPersonaAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const empresaId = str(formData, "empresaId");
  const nombres = str(formData, "nombres");
  const apellidoPaterno = str(formData, "apellidoPaterno");
  if (!nombres || !apellidoPaterno) {
    return { error: "Nombre(s) y apellido paterno son obligatorios." };
  }

  try {
    await crearPersona({
      empresaId,
      nombres,
      apellidoPaterno,
      apellidoMaterno: str(formData, "apellidoMaterno") || undefined,
      curp: str(formData, "curp") || undefined,
      rfc: str(formData, "rfc") || undefined,
      emailPersonal: str(formData, "emailPersonal") || undefined,
      telefono: str(formData, "telefono") || undefined,
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "No se pudo crear la persona." };
  }

  revalidatePath(`/empresas/${empresaId}/personas`);
  return undefined;
}
