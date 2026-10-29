"use client";

import { useActionState } from "react";
import type { Persona } from "@/cores/core-3-personas/types";
import type { Puesto } from "@/cores/core-2-puestos/types";
import type { UnidadOrganizacional } from "@/cores/core-1-estructura/types";
import {
  crearAsignacionAction,
  crearPlazaAction,
  crearSedeAction,
  crearUnidadAction,
  finalizarAsignacionAction,
} from "./actions";

const inputClass =
  "rounded border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700";
const buttonClass =
  "w-fit rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900";

function ErrorMsg({ error }: { error?: string }) {
  if (!error) return null;
  return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>;
}

export function CrearSedeForm({ empresaId }: { empresaId: string }) {
  const [state, formAction, pending] = useActionState(crearSedeAction, undefined);
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="empresaId" value={empresaId} />
      <div className="grid gap-3 sm:grid-cols-4">
        <input name="nombre" placeholder="Nombre de la sede *" required className={inputClass} />
        <input name="ciudad" placeholder="Ciudad" className={inputClass} />
        <input name="estado" placeholder="Estado" className={inputClass} />
        <input name="direccion" placeholder="Dirección" className={inputClass} />
      </div>
      <ErrorMsg error={state?.error} />
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Creando..." : "Agregar sede"}
      </button>
    </form>
  );
}

export function CrearUnidadForm({
  empresaId,
  sedes,
  unidades,
}: {
  empresaId: string;
  sedes: { id: string; nombre: string }[];
  unidades: UnidadOrganizacional[];
}) {
  const [state, formAction, pending] = useActionState(crearUnidadAction, undefined);
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="empresaId" value={empresaId} />
      <div className="grid gap-3 sm:grid-cols-4">
        <input name="nombre" placeholder="Nombre *" required className={inputClass} />
        <select name="tipo" defaultValue="area" className={inputClass}>
          <option value="direccion">Dirección</option>
          <option value="area">Área</option>
          <option value="jefatura">Jefatura</option>
        </select>
        <select name="sedeId" defaultValue="" className={inputClass}>
          <option value="">Sin sede</option>
          {sedes.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nombre}
            </option>
          ))}
        </select>
        <select name="unidadPadreId" defaultValue="" className={inputClass}>
          <option value="">Sin unidad padre (raíz)</option>
          {unidades.map((u) => (
            <option key={u.id} value={u.id}>
              {u.nombre}
            </option>
          ))}
        </select>
      </div>
      <ErrorMsg error={state?.error} />
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Creando..." : "Agregar unidad organizacional"}
      </button>
    </form>
  );
}

export function CrearPlazaForm({
  empresaId,
  unidades,
  puestos,
}: {
  empresaId: string;
  unidades: UnidadOrganizacional[];
  puestos: Puesto[];
}) {
  const [state, formAction, pending] = useActionState(crearPlazaAction, undefined);
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="empresaId" value={empresaId} />
      <div className="grid gap-3 sm:grid-cols-4">
        <select name="unidadOrganizacionalId" required defaultValue="" className={inputClass}>
          <option value="" disabled>
            Unidad organizacional *
          </option>
          {unidades.map((u) => (
            <option key={u.id} value={u.id}>
              {u.nombre}
            </option>
          ))}
        </select>
        <select name="puestoId" defaultValue="" className={inputClass}>
          <option value="">Sin puesto definido</option>
          {puestos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </select>
        <input name="codigo" placeholder="Código" className={inputClass} />
        <select name="estado" defaultValue="autorizada" className={inputClass}>
          <option value="autorizada">Autorizada</option>
          <option value="vacante">Vacante</option>
          <option value="congelada">Congelada</option>
        </select>
      </div>
      <ErrorMsg error={state?.error} />
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Creando..." : "Agregar plaza"}
      </button>
    </form>
  );
}

export function CrearAsignacionForm({
  empresaId,
  plazas,
  personas,
}: {
  empresaId: string;
  plazas: { id: string; codigo: string | null }[];
  personas: Persona[];
}) {
  const [state, formAction, pending] = useActionState(crearAsignacionAction, undefined);
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="empresaId" value={empresaId} />
      <div className="grid gap-3 sm:grid-cols-4">
        <select name="plazaId" required defaultValue="" className={inputClass}>
          <option value="" disabled>
            Plaza *
          </option>
          {plazas.map((p) => (
            <option key={p.id} value={p.id}>
              {p.codigo ?? p.id.slice(0, 8)}
            </option>
          ))}
        </select>
        <select name="personaId" required defaultValue="" className={inputClass}>
          <option value="" disabled>
            Persona *
          </option>
          {personas.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombres} {p.apellido_paterno}
            </option>
          ))}
        </select>
        <input type="date" name="fechaInicio" required className={inputClass} />
        <select name="tipo" defaultValue="titular" className={inputClass}>
          <option value="titular">Titular</option>
          <option value="interino">Interino</option>
          <option value="cobertura_temporal">Cobertura temporal</option>
          <option value="doble_funcion">Doble función</option>
        </select>
      </div>
      <ErrorMsg error={state?.error} />
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Asignando..." : "Asignar persona a plaza"}
      </button>
    </form>
  );
}

export function FinalizarAsignacionButton({
  empresaId,
  asignacionId,
}: {
  empresaId: string;
  asignacionId: string;
}) {
  return (
    <form action={finalizarAsignacionAction}>
      <input type="hidden" name="empresaId" value={empresaId} />
      <input type="hidden" name="asignacionId" value={asignacionId} />
      <button
        type="submit"
        className="text-xs font-medium text-red-600 hover:underline dark:text-red-400"
      >
        Finalizar
      </button>
    </form>
  );
}
