"use client";

import { useActionState } from "react";
import type { Persona } from "@/cores/core-3-personas/types";
import type { Puesto } from "@/cores/core-2-puestos/types";
import { crearPuestoAction, registrarBandaSalarialAction } from "./actions";

const inputClass =
  "rounded border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700";
const buttonClass =
  "w-fit rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900";

function ErrorMsg({ error }: { error?: string }) {
  if (!error) return null;
  return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>;
}

export function CrearPuestoForm({ empresaId }: { empresaId: string }) {
  const [state, formAction, pending] = useActionState(crearPuestoAction, undefined);
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="empresaId" value={empresaId} />
      <div className="grid gap-3 sm:grid-cols-4">
        <input name="nombre" placeholder="Nombre del puesto *" required className={inputClass} />
        <input name="familiaPuesto" placeholder="Familia (ej. Ventas)" className={inputClass} />
        <input name="nivel" placeholder="Nivel (ej. Gerencial)" className={inputClass} />
        <input name="objetivoPuesto" placeholder="Objetivo del puesto" className={inputClass} />
      </div>
      <ErrorMsg error={state?.error} />
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Creando..." : "Agregar puesto"}
      </button>
    </form>
  );
}

export function RegistrarBandaSalarialForm({
  empresaId,
  puestos,
  personas,
}: {
  empresaId: string;
  puestos: Puesto[];
  personas: Persona[];
}) {
  const [state, formAction, pending] = useActionState(registrarBandaSalarialAction, undefined);
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="empresaId" value={empresaId} />
      <div className="grid gap-3 sm:grid-cols-3">
        <select name="puestoId" required defaultValue="" className={inputClass}>
          <option value="" disabled>
            Puesto *
          </option>
          {puestos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </select>
        <select name="autorId" required defaultValue="" className={inputClass}>
          <option value="" disabled>
            Autor *
          </option>
          {personas.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombres} {p.apellido_paterno}
            </option>
          ))}
        </select>
        <input type="number" step="0.01" name="salarioMin" placeholder="Salario mínimo *" required className={inputClass} />
        <input type="number" step="0.01" name="salarioMedio" placeholder="Salario medio" className={inputClass} />
        <input type="number" step="0.01" name="salarioMax" placeholder="Salario máximo *" required className={inputClass} />
        <input name="motivoNuevaVersion" placeholder="Motivo (obligatorio si ya hay banda vigente)" className={inputClass} />
      </div>
      <ErrorMsg error={state?.error} />
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Registrando..." : "Registrar / revisar banda salarial"}
      </button>
    </form>
  );
}
