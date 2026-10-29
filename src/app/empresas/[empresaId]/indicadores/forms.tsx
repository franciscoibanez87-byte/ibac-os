"use client";

import { useActionState } from "react";
import type { Indicador } from "@/cores/core-7-indicadores/types";
import { crearIndicadorAction, registrarResultadoAction } from "./actions";

const inputClass =
  "rounded border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700";
const buttonClass =
  "w-fit rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900";

export function CrearIndicadorForm({ empresaId }: { empresaId: string }) {
  const [state, formAction, pending] = useActionState(crearIndicadorAction, undefined);
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="empresaId" value={empresaId} />
      <div className="grid gap-3 sm:grid-cols-4">
        <input name="nombre" placeholder="Nombre del indicador *" required className={inputClass} />
        <input name="unidadMedida" placeholder="Unidad de medida" className={inputClass} />
        <input name="periodicidad" placeholder="Periodicidad" className={inputClass} />
        <input name="metodoCalculo" placeholder="Método de cálculo" className={inputClass} />
      </div>
      {state?.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Creando..." : "Agregar indicador"}
      </button>
    </form>
  );
}

export function RegistrarResultadoForm({ empresaId, indicadores }: { empresaId: string; indicadores: Indicador[] }) {
  const [state, formAction, pending] = useActionState(registrarResultadoAction, undefined);
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="empresaId" value={empresaId} />
      <div className="grid gap-3 sm:grid-cols-4">
        <select name="indicadorId" required defaultValue="" className={inputClass}>
          <option value="" disabled>
            Indicador *
          </option>
          {indicadores.map((i) => (
            <option key={i.id} value={i.id}>
              {i.nombre}
            </option>
          ))}
        </select>
        <input type="date" name="periodoInicio" required className={inputClass} />
        <input type="date" name="periodoFin" required className={inputClass} />
        <input type="number" step="0.01" name="valor" placeholder="Valor medido *" required className={inputClass} />
        <input name="notas" placeholder="Notas" className={inputClass} />
      </div>
      {state?.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Registrando..." : "Registrar resultado"}
      </button>
    </form>
  );
}
