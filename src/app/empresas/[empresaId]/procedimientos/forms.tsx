"use client";

import { useActionState } from "react";
import type { Persona } from "@/cores/core-3-personas/types";
import { crearProcedimientoAction } from "./actions";

const inputClass =
  "rounded border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700";
const buttonClass =
  "w-fit rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900";

export function CrearProcedimientoForm({ empresaId, personas }: { empresaId: string; personas: Persona[] }) {
  const [state, formAction, pending] = useActionState(crearProcedimientoAction, undefined);
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="empresaId" value={empresaId} />
      <div className="grid gap-3 sm:grid-cols-3">
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
        <input name="nombre" placeholder="Nombre del procedimiento *" required className={inputClass} />
        <input name="objetivo" placeholder="Objetivo" className={inputClass} />
      </div>
      <textarea
        name="pasos"
        placeholder={"Un paso por línea, en orden:\n1. Recibir solicitud\n2. Validar documentación\n3. Autorizar"}
        rows={5}
        className={inputClass}
      />
      {state?.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Guardando..." : "Crear procedimiento (v1, borrador)"}
      </button>
    </form>
  );
}
