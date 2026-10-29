import { notFound } from "next/navigation";
import { obtenerPuestoCompleto } from "@/cores/core-2-puestos/queries";
import { CondicionesInherentesForm, CrearKpiPuestoForm } from "./forms";

export default async function PuestoDetallePage({
  params,
}: PageProps<"/empresas/[empresaId]/puestos/[puestoId]">) {
  const { empresaId, puestoId } = await params;

  const puesto = await obtenerPuestoCompleto(puestoId);
  if (!puesto) notFound();

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="text-xl font-semibold">{puesto.nombre}</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {puesto.familia_puesto ?? "Sin familia"} · {puesto.nivel ?? "Sin nivel"}
        </p>
        {puesto.objetivo_puesto && <p className="mt-2 text-sm">{puesto.objetivo_puesto}</p>}
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="font-medium">Condiciones inherentes al rol</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Describe el rol en abstracto — nunca lo pactado con una persona (eso vive en el Contrato, CORE 4).
        </p>
        <CondicionesInherentesForm empresaId={empresaId} puestoId={puestoId} condiciones={puesto.condiciones_inherentes} />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-medium">KPIs del puesto (metas)</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          La definición general del indicador y su resultado medido viven en CORE 7; esto es solo la META que este puesto fija.
        </p>
        {puesto.kpis.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Sin KPIs definidos.</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {puesto.kpis.map((k) => (
              <li key={k.id}>
                {k.nombre}
                {k.meta_valor !== null ? ` — meta: ${k.meta_valor}${k.meta_unidad ?? ""}` : ""}
                {k.periodicidad ? ` (${k.periodicidad})` : ""}
              </li>
            ))}
          </ul>
        )}
        <CrearKpiPuestoForm empresaId={empresaId} puestoId={puestoId} />
      </section>
    </div>
  );
}
