"use server";

import { revalidatePath } from "next/cache";
import {
  atenderAlerta,
  crearInstancia,
  crearObligacion,
  registrarAccionCumplimiento,
} from "@/cores/core-8-cumplimiento/queries";
import type { CumplimientoEstatus, CumplimientoRiesgoNivel } from "@/cores/core-8-cumplimiento/types";

type ActionState = { error?: string } | undefined;

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

export async function crearObligacionAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const empresaId = str(formData, "empresaId");
  const nombre = str(formData, "nombre");
  if (!nombre) return { error: "El nombre de la obligación es obligatorio." };

  try {
    await crearObligacion({
      empresaId,
      nombre,
      categoria: str(formData, "categoria") || undefined,
      periodicidad: str(formData, "periodicidad") || undefined,
      riesgoNivelInherente: (str(formData, "riesgoNivelInherente") || undefined) as CumplimientoRiesgoNivel | undefined,
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "No se pudo crear la obligación." };
  }

  revalidatePath(`/empresas/${empresaId}/cumplimiento`);
  return undefined;
}

export async function crearInstanciaAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const empresaId = str(formData, "empresaId");
  const obligacionId = str(formData, "obligacionId");
  const periodoInicio = str(formData, "periodoInicio");
  const periodoFin = str(formData, "periodoFin");
  const fechaLimite = str(formData, "fechaLimite");

  if (!obligacionId || !periodoInicio || !periodoFin || !fechaLimite) {
    return { error: "Obligación, período y fecha límite son obligatorios." };
  }

  try {
    await crearInstancia({
      obligacionId,
      periodoInicio,
      periodoFin,
      fechaLimite,
      responsablePersonaId: str(formData, "responsablePersonaId") || undefined,
    });
  } catch (err) {
    // uq_cumplimiento_instancia_periodo es la causa más probable.
    return { error: err instanceof Error ? err.message : "No se pudo crear la instancia." };
  }

  revalidatePath(`/empresas/${empresaId}/cumplimiento`);
  return undefined;
}

export async function registrarAccionAction(formData: FormData): Promise<void> {
  const empresaId = str(formData, "empresaId");
  const instanciaId = str(formData, "instanciaId");
  const accionRealizada = str(formData, "accionRealizada");
  const nuevoEstatus = str(formData, "nuevoEstatus") as CumplimientoEstatus;

  await registrarAccionCumplimiento({ instanciaId, accionRealizada, nuevoEstatus });
  revalidatePath(`/empresas/${empresaId}/cumplimiento`);
}

export async function atenderAlertaAction(formData: FormData): Promise<void> {
  const empresaId = str(formData, "empresaId");
  const alertaId = str(formData, "alertaId");
  const atendidaPor = str(formData, "atendidaPor");

  await atenderAlerta(alertaId, atendidaPor);
  revalidatePath(`/empresas/${empresaId}/cumplimiento`);
}
