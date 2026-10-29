"use server";

import { revalidatePath } from "next/cache";
import {
  crearAsignacion,
  crearPlaza,
  crearSede,
  crearUnidadOrganizacional,
  finalizarAsignacion,
} from "@/cores/core-1-estructura/queries";
import type { AsignacionTipo, PlazaEstado, UnidadOrganizacionalTipo } from "@/cores/core-1-estructura/types";

type ActionState = { error?: string } | undefined;

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

export async function crearSedeAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const empresaId = str(formData, "empresaId");
  const nombre = str(formData, "nombre");
  if (!nombre) return { error: "El nombre de la sede es obligatorio." };

  try {
    await crearSede({
      empresaId,
      nombre,
      direccion: str(formData, "direccion") || undefined,
      ciudad: str(formData, "ciudad") || undefined,
      estado: str(formData, "estado") || undefined,
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "No se pudo crear la sede." };
  }

  revalidatePath(`/empresas/${empresaId}`);
  return undefined;
}

export async function crearUnidadAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const empresaId = str(formData, "empresaId");
  const nombre = str(formData, "nombre");
  const tipo = str(formData, "tipo") as UnidadOrganizacionalTipo;
  if (!nombre) return { error: "El nombre de la unidad es obligatorio." };

  try {
    await crearUnidadOrganizacional({
      empresaId,
      nombre,
      tipo,
      sedeId: str(formData, "sedeId") || undefined,
      unidadPadreId: str(formData, "unidadPadreId") || undefined,
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "No se pudo crear la unidad organizacional." };
  }

  revalidatePath(`/empresas/${empresaId}`);
  return undefined;
}

export async function crearPlazaAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const empresaId = str(formData, "empresaId");
  const unidadOrganizacionalId = str(formData, "unidadOrganizacionalId");
  if (!unidadOrganizacionalId) return { error: "Selecciona la unidad organizacional de la plaza." };

  try {
    await crearPlaza({
      empresaId,
      unidadOrganizacionalId,
      puestoId: str(formData, "puestoId") || undefined,
      codigo: str(formData, "codigo") || undefined,
      estado: (str(formData, "estado") || undefined) as PlazaEstado | undefined,
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "No se pudo crear la plaza." };
  }

  revalidatePath(`/empresas/${empresaId}`);
  return undefined;
}

export async function crearAsignacionAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const empresaId = str(formData, "empresaId");
  const plazaId = str(formData, "plazaId");
  const personaId = str(formData, "personaId");
  const fechaInicio = str(formData, "fechaInicio");
  if (!plazaId || !personaId || !fechaInicio) {
    return { error: "Plaza, persona y fecha de inicio son obligatorios." };
  }

  try {
    await crearAsignacion({
      plazaId,
      personaId,
      fechaInicio,
      tipo: (str(formData, "tipo") || undefined) as AsignacionTipo | undefined,
    });
  } catch (err) {
    // uq_plaza_un_titular_activo es la causa más probable: la plaza ya
    // tiene un titular activo. No reintentar — hay que finalizar esa
    // asignación primero (ver finalizarAsignacionAction).
    return {
      error:
        err instanceof Error
          ? `${err.message} (¿la plaza ya tiene un titular activo? Finalízalo primero.)`
          : "No se pudo crear la asignación.",
    };
  }

  revalidatePath(`/empresas/${empresaId}`);
  return undefined;
}

export async function finalizarAsignacionAction(formData: FormData): Promise<void> {
  const empresaId = str(formData, "empresaId");
  const asignacionId = str(formData, "asignacionId");
  const fechaFin = str(formData, "fechaFin") || new Date().toISOString().slice(0, 10);

  await finalizarAsignacion(asignacionId, fechaFin, "Finalizada desde IBAC OS");
  revalidatePath(`/empresas/${empresaId}`);
}
