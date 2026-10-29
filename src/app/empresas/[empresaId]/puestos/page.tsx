import Link from "next/link";
import { notFound } from "next/navigation";
import { listarPuestos, obtenerPuestoCompleto } from "@/cores/core-2-puestos/queries";
import { listarPersonas } from "@/cores/core-3-personas/queries";
import { obtenerEmpresa } from "@/cores/core-1-estructura/queries";
import { CrearPuestoForm, RegistrarBandaSalarialForm } from "./forms";

export default async function PuestosPage({ params }: PageProps<"/empresas/[empresaId]/puestos">) {
  const { empresaId } = await params;

  const empresa = await obtenerEmpresa(empresaId);
  if (!empresa) notFound();

  const [puestos, personas] = await Promise.all([listarPuestos(empresaId), listarPersonas(empresaId)]);
  const puestosCompletos = await Promise.all(puestos.map((p) => obtenerPuestoCompleto(p.id)));

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="text-xl font-semibold">Puestos — {empresa.razon_social}</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          CORE 2 — catálogo de puestos y su banda salarial de REFERENCIA. El salario pactado vive en Contratos (CORE 4).
        </p>
      </div>

      <section className="flex flex-col gap-4">
        {puestosCompletos.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Todavía no hay puestos registrados.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {puestosCompletos.map((p) =>
              p ? (
                <li key={p.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <Link href={`/empresas/${empresaId}/puestos/${p.id}`} className="font-medium hover:underline">
                      {p.nombre}
                    </Link>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      {p.familia_puesto ?? "Sin familia"} · {p.nivel ?? "Sin nivel"}
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    {p.banda_salarial_vigente ? (
                      <span className="text-emerald-700 dark:text-emerald-400">
                        {p.banda_salarial_vigente.moneda} {p.banda_salarial_vigente.salario_min.toLocaleString()} –{" "}
                        {p.banda_salarial_vigente.salario_max.toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-zinc-400 dark:text-zinc-500">sin banda publicada</span>
                    )}
                  </div>
                </li>
              ) : null
            )}
          </ul>
        )}
        <CrearPuestoForm empresaId={empresaId} />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-medium">Registrar / revisar banda salarial</h2>
        <RegistrarBandaSalarialForm empresaId={empresaId} puestos={puestos} personas={personas} />
      </section>
    </div>
  );
}
