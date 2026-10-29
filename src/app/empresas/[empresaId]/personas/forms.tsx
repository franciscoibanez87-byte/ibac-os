"use client";

import { useActionState } from "react";
import { crearPersonaAction } from "./actions";

const inputClass =
  "rounded border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700";
const buttonClass =
  "w-fit rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900";

export function CrearPersonaForm({ empresaId }: { empresaId: string }) {
  const [state, formAction, pending] = useActionState(crearPersonaAction, undefined);
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="empresaId" value={empresaId} />
      <div className="grid gap-3 sm:grid-cols-4">
        <input name="nombres" placeholder="Nombre(s) *" required className={inputClass} />
        <input name="apellidoPaterno" placeholder="Apellido paterno *" required className={inputClass} />
        <input name="apellidoMaterno" placeholder="Apellido materno" className={inputClass} />
        <input name="curp" placeholder="CURP" className={inputClass} />
        <input name="rfc" placeholder="RFC" className={inputClass} />
        <input name="emailPersonal" type="email" placeholder="Email personal" className={inputClass} />
        <input name="telefono" placeholder="Teléfono" className={inputClass} />
      </div>
      {state?.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Creando..." : "Agregar persona"}
      </button>
    </form>
  );
}
