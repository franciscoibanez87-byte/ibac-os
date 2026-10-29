"use server";

import { revalidatePath } from "next/cache";
import { registrarContrato } from "@/cores/core-4-contratos/queries";
import type { ContratoJornada, ContratoModalidad, ContratoPeriodicidadPago, ContratoTipo } from "@/cores/core-4-contratos/types";
import { registrarEvidenciaAsistencia } from "@/cores/core-8-cumplimiento/queries";
import type { EvidenciaAsistenciaTipo } from "@/cores/core-8-cumplimiento/types";
import { registrarEventoMovimiento } from "@/transversal/eventos/queries";
import type { EventoMovimientoTipo } from "@/transversal/eventos/types";
import { asociarDocumento, subirDocumentoConArchivo } from "@/transversal/documentos/queries";

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

export async function registrarEvidenciaAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const empresaId = str(formData, "empresaId");
  const personaId = str(formData, "personaId");
  const fecha = str(formData, "fecha");
  const tipoEvento = str(formData, "tipoEvento") as EvidenciaAsistenciaTipo;
  if (!fecha) return { error: "La fecha es obligatoria." };

  try {
    await registrarEvidenciaAsistencia({
      personaId,
      fecha,
      tipoEvento,
      justificacion: str(formData, "justificacion") || undefined,
      vigenciaPeriodoInicio: str(formData, "vigenciaPeriodoInicio") || undefined,
      vigenciaPeriodoFin: str(formData, "vigenciaPeriodoFin") || undefined,
    });
  } catch (err) {
    // chk_evidencia_asistencia_vigencia es la causa más probable si el
    // rango de vigencia viene invertido.
    return { error: err instanceof Error ? err.message : "No se pudo registrar la evidencia de asistencia." };
  }

  revalidatePath(`/empresas/${empresaId}/personas/${personaId}`);
  return undefined;
}

export async function registrarMovimientoAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const empresaId = str(formData, "empresaId");
  const personaId = str(formData, "personaId");
  const tipo = str(formData, "tipo") as EventoMovimientoTipo;
  const fechaEfectiva = str(formData, "fechaEfectiva");
  if (!fechaEfectiva) return { error: "La fecha efectiva es obligatoria." };

  try {
    await registrarEventoMovimiento({
      empresaId,
      personaId,
      tipo,
      fechaEfectiva,
      motivo: str(formData, "motivo") || undefined,
    });
  } catch (err) {
    // chk_evento_movimiento_alta/baja son la causa más probable si el tipo
    // elegido no admite plaza_anterior_id/plaza_nueva_id como se mandaron
    // (aquí no se capturan desde este formulario simplificado).
    return { error: err instanceof Error ? err.message : "No se pudo registrar el movimiento." };
  }

  revalidatePath(`/empresas/${empresaId}/personas/${personaId}`);
  return undefined;
}

export async function subirDocumentoPersonaAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const empresaId = str(formData, "empresaId");
  const personaId = str(formData, "personaId");
  const nombre = str(formData, "nombre");
  const archivo = formData.get("archivo");
  if (!nombre || !(archivo instanceof File) || archivo.size === 0) {
    return { error: "Nombre y archivo son obligatorios." };
  }

  try {
    const documento = await subirDocumentoConArchivo({
      empresaId,
      nombre,
      archivo,
      categoria: str(formData, "categoria") || undefined,
    });
    await asociarDocumento(documento.documento_logico_id, "persona", personaId);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "No se pudo subir el documento." };
  }

  revalidatePath(`/empresas/${empresaId}/personas/${personaId}`);
  return undefined;
}
