"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { crearEmpresa } from "@/cores/core-1-estructura/queries";

export async function crearEmpresaAction(_prevState: unknown, formData: FormData) {
  const razonSocial = String(formData.get("razonSocial") ?? "").trim();
  if (!razonSocial) {
    return { error: "La razón social es obligatoria." };
  }

  const rfc = String(formData.get("rfc") ?? "").trim();
  const nombreComercial = String(formData.get("nombreComercial") ?? "").trim();

  let empresa;
  try {
    empresa = await crearEmpresa({
      razonSocial,
      rfc: rfc || undefined,
      nombreComercial: nombreComercial || undefined,
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "No se pudo crear la empresa." };
  }

  revalidatePath("/empresas");
  redirect(`/empresas/${empresa.id}`);
}
