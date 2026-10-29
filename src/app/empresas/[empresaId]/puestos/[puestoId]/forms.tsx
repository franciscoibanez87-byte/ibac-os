"use client";

import { useActionState } from "react";
import type { PuestoCondicionesInherentes } from "@/cores/core-2-puestos/types";
import { crearKpiPuestoAction, guardarCondicionesAction } from "./actions";

const inputClass =
  "rounded border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700";
const buttonClass =
  "w-fit rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900";

export function CondicionesInherentesForm({
  empresaId,
  puestoId,
  condiciones,
}: {
  empresaId: string;
  puestoId: string;
  condiciones: PuestoCondicionesInherentes | null;
}) {
  const [state, formAction, pending] = useActionState(guardarCondicionesAction, undefined);
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="empresaId" value={empresaId} />
      <input type="hidden" name="puestoId" value={puestoId} />
      <div className="grid gap-3 sm:grid-cols-3">
        <input
          name="riesgoExposicion"
          placeholder="Riesgo de exposición"
          defaultValue={condiciones?.riesgo_exposicion ?? ""}
          className={inputClass}
        />
        <input
          name="trabajoFisico"
          placeholder="Trabajo físico"
          defaultValue={condiciones?.trabajo_fisico ?? ""}
          className={inputClass}
        />
        <input
          name="entorno"
          placeholder="Entorno (planta, oficina, campo...)"
          defaultValue={condiciones?.entorno ?? ""}
          className={inputClass}
        />
        <input
          name="disponibilidad"
          placeholder="Disponibilidad"
          defaultValue={condiciones?.disponibilidad ?? ""}
          className={inputClass}
        />
        <input
          name="frecuenciaViajes"
          placeholder="Frecuencia de viajes"
          defaultValue={condiciones?.frecuencia_viajes ?? ""}
          className={inputClass}
        />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="requiereViajes" defaultChecked={condiciones?.requiere_viajes ?? false} />
          Requiere viajes
        </label>
      </div>
      <input
        name="requerimientosEspeciales"
        placeholder="Requerimientos especiales (licencias, EPP, certificaciones...)"
        defaultValue={condiciones?.requerimientos_especiales ?? ""}
        className={inputClass}
      />
      {state?.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Guardando..." : "Guardar condiciones inherentes"}
      </button>
    </form>
  );
}

export function CrearKpiPuestoForm({ empresaId, puestoId }: { empresaId: string; puestoId: string }) {
  const [state, formAction, pending] = useActionState(crearKpiPuestoAction, undefined);
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="empresaId" value={empresaId} />
      <input type="hidden" name="puestoId" value={puestoId} />
      <div className="grid gap-3 sm:grid-cols-4">
        <input name="nombre" placeholder="Nombre del KPI *" required className={inputClass} />
        <input type="number" step="0.01" name="metaValor" placeholder="Meta" className={inputClass} />
        <input name="metaUnidad" placeholder="Unidad (%, pts NPS...)" className={inputClass} />
        <input name="periodicidad" placeholder="Periodicidad" className={inputClass} />
      </div>
      {state?.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Agregando..." : "Agregar KPI al puesto"}
      </button>
    </form>
  );
}
