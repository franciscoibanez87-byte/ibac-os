"use client";

import { useActionState } from "react";
import type { Persona } from "@/cores/core-3-personas/types";
import { registrarContratoAction } from "./actions";

const inputClass =
  "rounded border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700";
const buttonClass =
  "w-fit rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900";

export function RegistrarContratoForm({
  empresaId,
  personaId,
  personas,
}: {
  empresaId: string;
  personaId: string;
  personas: Persona[];
}) {
  const [state, formAction, pending] = useActionState(registrarContratoAction, undefined);
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="empresaId" value={empresaId} />
      <input type="hidden" name="personaId" value={personaId} />
      <div className="grid gap-3 sm:grid-cols-3">
        <select name="autorId" required defaultValue="" className={inputClass}>
          <option value="" disabled>
            Autor (quién registra) *
          </option>
          {personas.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombres} {p.apellido_paterno}
            </option>
          ))}
        </select>
        <select name="tipoContrato" defaultValue="indeterminado" className={inputClass}>
          <option value="indeterminado">Indeterminado</option>
          <option value="determinado">Determinado</option>
          <option value="por_obra">Por obra</option>
          <option value="periodo_prueba">Periodo de prueba</option>
          <option value="capacitacion_inicial">Capacitación inicial</option>
        </select>
        <select name="modalidad" defaultValue="presencial" className={inputClass}>
          <option value="presencial">Presencial</option>
          <option value="remoto">Remoto</option>
          <option value="hibrido">Híbrido</option>
        </select>
        <select name="jornadaPactada" defaultValue="diurna" className={inputClass}>
          <option value="diurna">Diurna</option>
          <option value="nocturna">Nocturna</option>
          <option value="mixta">Mixta</option>
          <option value="por_hora">Por hora</option>
        </select>
        <select name="periodicidadPago" defaultValue="quincenal" className={inputClass}>
          <option value="semanal">Semanal</option>
          <option value="quincenal">Quincenal</option>
          <option value="mensual">Mensual</option>
        </select>
        <input type="number" step="0.01" name="salarioPactado" placeholder="Salario pactado *" required className={inputClass} />
        <input name="condicionesContractuales" placeholder="Condiciones contractuales" className={inputClass} />
        <input
          name="motivoNuevaVersion"
          placeholder="Motivo (obligatorio si ya hay contrato vigente)"
          className={inputClass}
        />
      </div>
      {state?.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Registrando..." : "Registrar / revisar contrato"}
      </button>
    </form>
  );
}
