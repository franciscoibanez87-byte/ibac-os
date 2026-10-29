import { notFound } from "next/navigation";
import { obtenerEmpresa } from "@/cores/core-1-estructura/queries";
import { listarTodasLasPoliticas } from "@/cores/core-5-politicas/queries";
import { listarPersonas } from "@/cores/core-3-personas/queries";
import { LifecycleBadge } from "../lifecycle-buttons";
import { CrearPoliticaForm } from "./forms";

export default async function PoliticasPage({ params }: PageProps<"/empresas/[empresaId]/politicas">) {
  const { empresaId } = await params;

  const empresa = await obtenerEmpresa(empresaId);
  if (!empresa) notFound();

  const [politicas, personas] = await Promise.all([listarTodasLasPoliticas(empresaId), listarPersonas(empresaId)]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold">Políticas — {empresa.razon_social}</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          CORE 5 — ciclo de vida vía el Motor de Objeto Gobernado: borrador → en revisión → aprobado → publicado → archivado.
        </p>
      </div>

      {politicas.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Todavía no hay políticas registradas.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {politicas.map((p) => (
            <li key={p.id} className="flex flex-col gap-2 px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">
                  {p.nombre} {p.categoria ? `(${p.categoria})` : ""}
                </span>
              </div>
              <LifecycleBadge objeto={p.objeto_gobernado} personas={personas} revalidar={`/empresas/${empresaId}/politicas`} />
            </li>
          ))}
        </ul>
      )}

      <section className="flex flex-col gap-4">
        <h2 className="font-medium">Nueva política</h2>
        <CrearPoliticaForm empresaId={empresaId} personas={personas} />
      </section>
    </div>
  );
}
