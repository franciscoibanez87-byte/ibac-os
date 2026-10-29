"use client";

import { useActionState } from "react";
import type { Persona } from "@/cores/core-3-personas/types";
import { registrarContratoAction, registrarEvidenciaAction, registrarMovimientoAction, subirDocumentoPersonaAction } from "./actions";

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

export function RegistrarEvidenciaForm({ empresaId, personaId }: { empresaId: string; personaId: string }) {
  const [state, formAction, pending] = useActionState(registrarEvidenciaAction, undefined);
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="empresaId" value={empresaId} />
      <input type="hidden" name="personaId" value={personaId} />
      <div className="grid gap-3 sm:grid-cols-4">
        <input type="date" name="fecha" required className={inputClass} />
        <select name="tipoEvento" defaultValue="entrada" className={inputClass}>
          <option value="entrada">Entrada</option>
          <option value="salida">Salida</option>
          <option value="retardo">Retardo</option>
          <option value="falta">Falta</option>
          <option value="incapacidad">Incapacidad</option>
          <option value="vacaciones">Vacaciones</option>
          <option value="permiso">Permiso</option>
        </select>
        <input type="date" name="vigenciaPeriodoInicio" placeholder="Vigencia desde" className={inputClass} />
        <input type="date" name="vigenciaPeriodoFin" placeholder="Vigencia hasta" className={inputClass} />
      </div>
      <input name="justificacion" placeholder="Justificación" className={inputClass} />
      {state?.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Registrando..." : "Registrar evidencia de asistencia"}
      </button>
    </form>
  );
}

export function RegistrarMovimientoForm({ empresaId, personaId }: { empresaId: string; personaId: string }) {
  const [state, formAction, pending] = useActionState(registrarMovimientoAction, undefined);
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="empresaId" value={empresaId} />
      <input type="hidden" name="personaId" value={personaId} />
      <div className="grid gap-3 sm:grid-cols-3">
        <select name="tipo" defaultValue="alta" className={inputClass}>
          <option value="alta">Alta</option>
          <option value="baja">Baja</option>
          <option value="reingreso">Reingreso</option>
          <option value="promocion">Promoción</option>
          <option value="transferencia">Transferencia</option>
          <option value="cambio_plaza">Cambio de plaza</option>
          <option value="cambio_contractual">Cambio contractual</option>
        </select>
        <input type="date" name="fechaEfectiva" required className={inputClass} />
        <input name="motivo" placeholder="Motivo" className={inputClass} />
      </div>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Este formulario no captura plaza anterior/nueva — para altas/bajas/cambios que involucren una plaza, úsalo junto
        con Estructura (CORE 1).
      </p>
      {state?.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Registrando..." : "Registrar movimiento"}
      </button>
    </form>
  );
}

export function SubirDocumentoPersonaForm({ empresaId, personaId }: { empresaId: string; personaId: string }) {
  const [state, formAction, pending] = useActionState(subirDocumentoPersonaAction, undefined);
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="empresaId" value={empresaId} />
      <input type="hidden" name="personaId" value={personaId} />
      <div className="grid gap-3 sm:grid-cols-3">
        <input name="nombre" placeholder="Nombre del documento *" required className={inputClass} />
        <input name="categoria" placeholder="Categoría" className={inputClass} />
        <input name="storagePath" placeholder="Ruta de almacenamiento (storage_path) *" required className={inputClass} />
      </div>
      {state?.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Subiendo..." : "Subir documento"}
      </button>
    </form>
  );
}
