"use client";

import { useActionState } from "react";
import type { Persona } from "@/cores/core-3-personas/types";
import { crearPoliticaAction } from "./actions";

const inputClass =
  "rounded border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700";
const buttonClass =
  "w-fit rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900";

export function CrearPoliticaForm({ empresaId, personas }: { empresaId: string; personas: Persona[] }) {
  const [state, formAction, pending] = useActionState(crearPoliticaAction, undefined);
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
        <input name="nombre" placeholder="Nombre de la política *" required className={inputClass} />
        <input name="categoria" placeholder="Categoría" className={inputClass} />
      </div>
      <textarea
        name="cuerpo"
        placeholder="Cuerpo de la política *"
        required
        rows={4}
        className={inputClass}
      />
      {state?.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Guardando..." : "Crear política (v1, borrador)"}
      </button>
    </form>
  );
}
