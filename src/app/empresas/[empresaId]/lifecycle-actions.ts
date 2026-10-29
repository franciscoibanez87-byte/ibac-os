"use server";

// Acciones genéricas del ciclo de vida del Motor de Objeto Gobernado
// (borrador -> en_revision -> aprobado -> publicado -> archivado),
// reutilizadas por Políticas (CORE 5) y Procedimientos (CORE 6) — nunca
// hacer un `update` directo de estado/vigencia desde el cliente.

import { revalidatePath } from "next/cache";
import { archivarObjetoGobernado, aprobarObjetoGobernado, publicarObjetoGobernado } from "@/transversal/objeto-gobernado/queries";

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

export async function aprobarObjetoAction(formData: FormData): Promise<void> {
  const objetoGobernadoId = str(formData, "objetoGobernadoId");
  const aprobadoPor = str(formData, "aprobadoPor");
  const revalidar = str(formData, "revalidar");
  await aprobarObjetoGobernado(objetoGobernadoId, aprobadoPor);
  revalidatePath(revalidar);
}

export async function publicarObjetoAction(formData: FormData): Promise<void> {
  const objetoGobernadoId = str(formData, "objetoGobernadoId");
  const revalidar = str(formData, "revalidar");
  await publicarObjetoGobernado(objetoGobernadoId);
  revalidatePath(revalidar);
}

export async function archivarObjetoAction(formData: FormData): Promise<void> {
  const objetoGobernadoId = str(formData, "objetoGobernadoId");
  const revalidar = str(formData, "revalidar");
  await archivarObjetoGobernado(objetoGobernadoId);
  revalidatePath(revalidar);
}
