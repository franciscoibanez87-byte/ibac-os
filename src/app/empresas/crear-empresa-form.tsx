"use client";

import { useActionState } from "react";
import { crearEmpresaAction } from "./actions";

export function CrearEmpresaForm() {
  const [state, formAction, pending] = useActionState(crearEmpresaAction, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <h2 className="font-medium">Nueva empresa</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        <input
          name="razonSocial"
          placeholder="Razón social *"
          required
          className="rounded border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700"
        />
        <input
          name="nombreComercial"
          placeholder="Nombre comercial"
          className="rounded border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700"
        />
        <input
          name="rfc"
          placeholder="RFC"
          className="rounded border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700"
        />
      </div>
      {state?.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
      >
        {pending ? "Creando..." : "Crear empresa"}
      </button>
    </form>
  );
}
