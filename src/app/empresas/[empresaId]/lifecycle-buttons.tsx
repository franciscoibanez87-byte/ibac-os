"use client";

import { useState } from "react";
import type { ObjetoGobernado } from "@/transversal/objeto-gobernado/types";
import type { Persona } from "@/cores/core-3-personas/types";
import { aprobarObjetoAction, archivarObjetoAction, publicarObjetoAction } from "./lifecycle-actions";

const btn =
  "rounded-full border border-zinc-300 px-3 py-1 text-xs font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900";

/** Estado + controles de siguiente paso para un objeto_gobernado (política o procedimiento). */
export function LifecycleBadge({
  objeto,
  personas,
  revalidar,
}: {
  objeto: ObjetoGobernado;
  personas: Persona[];
  revalidar: string;
}) {
  const [aprobadoPor, setAprobadoPor] = useState("");

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="rounded bg-zinc-200 px-2 py-0.5 text-xs uppercase tracking-wide dark:bg-zinc-800">
        v{objeto.version} · {objeto.estado}
      </span>

      {objeto.estado === "borrador" && (
        <form action={aprobarObjetoAction} className="flex items-center gap-1">
          <input type="hidden" name="objetoGobernadoId" value={objeto.id} />
          <input type="hidden" name="revalidar" value={revalidar} />
          <select
            name="aprobadoPor"
            required
            value={aprobadoPor}
            onChange={(e) => setAprobadoPor(e.target.value)}
            className="rounded border border-zinc-300 bg-transparent px-2 py-1 text-xs dark:border-zinc-700"
          >
            <option value="" disabled>
              Aprobado por...
            </option>
            {personas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombres} {p.apellido_paterno}
              </option>
            ))}
          </select>
          <button type="submit" className={btn}>
            Aprobar
          </button>
        </form>
      )}

      {objeto.estado === "aprobado" && (
        <form action={publicarObjetoAction}>
          <input type="hidden" name="objetoGobernadoId" value={objeto.id} />
          <input type="hidden" name="revalidar" value={revalidar} />
          <button type="submit" className={btn}>
            Publicar
          </button>
        </form>
      )}

      {objeto.estado === "publicado" && objeto.vigente_hasta === null && (
        <form action={archivarObjetoAction}>
          <input type="hidden" name="objetoGobernadoId" value={objeto.id} />
          <input type="hidden" name="revalidar" value={revalidar} />
          <button type="submit" className={btn}>
            Archivar
          </button>
        </form>
      )}
    </div>
  );
}
