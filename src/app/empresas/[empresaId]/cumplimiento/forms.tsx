"use client";

import { useActionState, useState } from "react";
import type { ObligacionCumplimiento } from "@/cores/core-8-cumplimiento/types";
import type { Persona } from "@/cores/core-3-personas/types";
import { crearInstanciaAction, crearObligacionAction, registrarAccionAction } from "./actions";

const inputClass =
  "rounded border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700";
const buttonClass =
  "w-fit rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900";
const smallBtn =
  "rounded-full border border-zinc-300 px-3 py-1 text-xs font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900";

export function CrearObligacionForm({ empresaId }: { empresaId: string }) {
  const [state, formAction, pending] = useActionState(crearObligacionAction, undefined);
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="empresaId" value={empresaId} />
      <div className="grid gap-3 sm:grid-cols-4">
        <input name="nombre" placeholder="Nombre de la obligación *" required className={inputClass} />
        <input name="categoria" placeholder="Categoría" className={inputClass} />
        <select name="periodicidad" defaultValue="mensual" className={inputClass}>
          <option value="unica">Única</option>
          <option value="mensual">Mensual</option>
          <option value="trimestral">Trimestral</option>
          <option value="semestral">Semestral</option>
          <option value="anual">Anual</option>
        </select>
        <select name="riesgoNivelInherente" defaultValue="medio" className={inputClass}>
          <option value="bajo">Riesgo bajo</option>
          <option value="medio">Riesgo medio</option>
          <option value="alto">Riesgo alto</option>
          <option value="critico">Riesgo crítico</option>
        </select>
      </div>
      {state?.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Creando..." : "Agregar obligación"}
      </button>
    </form>
  );
}

export function CrearInstanciaForm({
  empresaId,
  obligaciones,
  personas,
}: {
  empresaId: string;
  obligaciones: ObligacionCumplimiento[];
  personas: Persona[];
}) {
  const [state, formAction, pending] = useActionState(crearInstanciaAction, undefined);
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="empresaId" value={empresaId} />
      <div className="grid gap-3 sm:grid-cols-4">
        <select name="obligacionId" required defaultValue="" className={inputClass}>
          <option value="" disabled>
            Obligación *
          </option>
          {obligaciones.map((o) => (
            <option key={o.id} value={o.id}>
              {o.nombre}
            </option>
          ))}
        </select>
        <select name="responsablePersonaId" defaultValue="" className={inputClass}>
          <option value="">Sin responsable asignado</option>
          {personas.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombres} {p.apellido_paterno}
            </option>
          ))}
        </select>
        <input type="date" name="periodoInicio" required className={inputClass} />
        <input type="date" name="periodoFin" required className={inputClass} />
        <input type="date" name="fechaLimite" required className={inputClass} />
      </div>
      {state?.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Creando..." : "Agregar instancia"}
      </button>
    </form>
  );
}

export function RegistrarAccionInline({ empresaId, instanciaId }: { empresaId: string; instanciaId: string }) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={smallBtn}>
        Registrar acción
      </button>
    );
  }
  return (
    <form action={registrarAccionAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="empresaId" value={empresaId} />
      <input type="hidden" name="instanciaId" value={instanciaId} />
      <input name="accionRealizada" placeholder="Acción realizada *" required className={inputClass} />
      <select name="nuevoEstatus" defaultValue="cumplido" className={inputClass}>
        <option value="en_proceso">En proceso</option>
        <option value="cumplido">Cumplido</option>
        <option value="no_aplica">No aplica</option>
      </select>
      <button type="submit" className={smallBtn}>
        Guardar
      </button>
    </form>
  );
}
