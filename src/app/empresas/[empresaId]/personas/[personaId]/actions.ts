"use server";

import { revalidatePath } from "next/cache";
import { registrarContrato } from "@/cores/core-4-contratos/queries";
import type { ContratoJornada, ContratoModalidad, ContratoPeriodicidadPago, ContratoTipo } from "@/cores/core-4-contratos/types";

type ActionState = { error?: string } | undefined;

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

export async function registrarContratoAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const empresaId = str(formData, "empresaId");
  const personaId = str(formData, "personaId");
  const autorId = str(formData, "autorId");
  const salarioPactado = Number(str(formData, "salarioPactado"));

  if (!autorId || !salarioPactado) {
    return { error: "Autor y salario pactado son obligatorios." };
  }

  try {
    await registrarContrato({
      personaId,
      empresaId,
      autorId,
      tipoContrato: str(formData, "tipoContrato") as ContratoTipo,
      modalidad: str(formData, "modalidad") as ContratoModalidad,
      jornadaPactada: str(formData, "jornadaPactada") as ContratoJornada,
      periodicidadPago: str(formData, "periodicidadPago") as ContratoPeriodicidadPago,
      salarioPactado,
      condicionesContractuales: str(formData, "condicionesContractuales") || undefined,
      motivoNuevaVersion: str(formData, "motivoNuevaVersion") || undefined,
    });
  } catch (err) {
    // Si la persona ya tenía un contrato vigente, motivoNuevaVersion es
    // obligatorio — el error de la función de Postgres lo deja claro.
    return { error: err instanceof Error ? err.message : "No se pudo registrar el contrato." };
  }

  revalidatePath(`/empresas/${empresaId}/personas/${personaId}`);
  return undefined;
}
