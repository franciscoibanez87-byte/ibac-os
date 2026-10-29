import { notFound } from "next/navigation";
import { obtenerEmpresa } from "@/cores/core-1-estructura/queries";
import { listarIndicadores, obtenerResultados } from "@/cores/core-7-indicadores/queries";
import { CrearIndicadorForm, RegistrarResultadoForm } from "./forms";

export default async function IndicadoresPage({ params }: PageProps<"/empresas/[empresaId]/indicadores">) {
  const { empresaId } = await params;

  const empresa = await obtenerEmpresa(empresaId);
  if (!empresa) notFound();

  const indicadores = await listarIndicadores(empresaId);
  const resultadosPorIndicador = await Promise.all(indicadores.map((i) => obtenerResultados(i.id)));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold">Indicadores — {empresa.razon_social}</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          CORE 7 — definición general del indicador y su resultado medido. La META por puesto vive en CORE 2 (KPI de puesto).
        </p>
      </div>

      {indicadores.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Todavía no hay indicadores registrados.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {indicadores.map((ind, i) => {
            const resultados = resultadosPorIndicador[i];
            const ultimo = resultados[0];
            return (
              <li key={ind.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="font-medium">{ind.nombre}</p>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {ind.unidad_medida ?? "sin unidad"} · {ind.periodicidad ?? "sin periodicidad"}
                  </p>
                </div>
                <span className="text-sm text-zinc-500 dark:text-zinc-400">
                  {ultimo ? `último: ${ultimo.valor} (${ultimo.periodo_fin})` : "sin resultados"}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <section className="flex flex-col gap-4">
        <h2 className="font-medium">Nuevo indicador</h2>
        <CrearIndicadorForm empresaId={empresaId} />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-medium">Registrar resultado medido</h2>
        <RegistrarResultadoForm empresaId={empresaId} indicadores={indicadores} />
      </section>
    </div>
  );
}
