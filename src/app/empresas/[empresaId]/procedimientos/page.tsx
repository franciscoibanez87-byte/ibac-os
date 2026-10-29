import { notFound } from "next/navigation";
import { obtenerEmpresa } from "@/cores/core-1-estructura/queries";
import { listarProcedimientos } from "@/cores/core-6-procedimientos/queries";
import { listarPersonas } from "@/cores/core-3-personas/queries";
import { LifecycleBadge } from "../lifecycle-buttons";
import { CrearProcedimientoForm } from "./forms";

export default async function ProcedimientosPage({ params }: PageProps<"/empresas/[empresaId]/procedimientos">) {
  const { empresaId } = await params;

  const empresa = await obtenerEmpresa(empresaId);
  if (!empresa) notFound();

  const [procedimientos, personas] = await Promise.all([listarProcedimientos(empresaId), listarPersonas(empresaId)]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold">Procedimientos — {empresa.razon_social}</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          CORE 6 — el CÓMO (los pasos). Demostrar que se ejecutaron es CORE 8 (Cumplimiento), no este CORE.
        </p>
      </div>

      {procedimientos.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Todavía no hay procedimientos registrados.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {procedimientos.map((p) => (
            <li key={p.id} className="flex flex-col gap-2 px-4 py-3">
              <span className="font-medium">{p.nombre}</span>
              {p.objetivo && <span className="text-sm text-zinc-500 dark:text-zinc-400">{p.objetivo}</span>}
              {p.pasos.length > 0 && (
                <ol className="ml-4 list-decimal text-sm text-zinc-600 dark:text-zinc-400">
                  {p.pasos.map((paso) => (
                    <li key={paso.id}>{paso.titulo}</li>
                  ))}
                </ol>
              )}
              <LifecycleBadge
                objeto={p.objeto_gobernado}
                personas={personas}
                revalidar={`/empresas/${empresaId}/procedimientos`}
              />
            </li>
          ))}
        </ul>
      )}

      <section className="flex flex-col gap-4">
        <h2 className="font-medium">Nuevo procedimiento</h2>
        <CrearProcedimientoForm empresaId={empresaId} personas={personas} />
      </section>
    </div>
  );
}
