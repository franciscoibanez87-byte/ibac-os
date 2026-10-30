"use client";

import { useActionState } from "react";
import { loginAction } from "./actions";

const inputClass =
  "rounded border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700";
const buttonClass =
  "w-full rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, undefined);

  return (
    <form action={formAction} className="flex w-full max-w-sm flex-col gap-4">
      <input type="email" name="email" placeholder="Correo" required autoComplete="email" className={inputClass} />
      <input
        type="password"
        name="password"
        placeholder="Contraseña"
        required
        autoComplete="current-password"
        className={inputClass}
      />
      {state?.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
