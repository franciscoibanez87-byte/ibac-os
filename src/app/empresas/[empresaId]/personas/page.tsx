import Link from "next/link";
import { notFound } from "next/navigation";
import { obtenerEmpresa } from "@/cores/core-1-estructura/queries";
import { listarPersonas } from "@/cores/core-3-personas/queries";
import { obtenerContratoVigente } from "@/cores/core-4-contratos/queries";
import { CrearPersonaForm } from "./forms";

export default async function PersonasPage({ params }: PageProps<"/empresas/[empresaId]/personas">) {
  const { empresaId } = await params;

  const empresa = await obtenerEmpresa(empresaId);
  if (!empresa) notFound();

  const personas = await listarPersonas(empresaId);
  const contratos = await Promise.all(personas.map((p) => obtenerContratoVigente(p.id)));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold">Personas — {empresa.razon_social}</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          CORE 3 — expedientes. El salario vigente se deriva de Contratos (CORE 4); la plaza vigente, de la Asignación (CORE 1).
        </p>
      </div>

      {personas.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Todavía no hay personas registradas.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {personas.map((p, i) => {
            const contrato = contratos[i];
            return (
              <li key={p.id} className="flex items-center justify-between px-4 py-3">
                <Link href={`/empresas/${empresaId}/personas/${p.id}`} className="font-medium hover:underline">
                  {p.nombres} {p.apellido_paterno} {p.apellido_materno ?? ""}
                </Link>
                <span className="text-sm text-zinc-500 dark:text-zinc-400">
                  {contrato ? `${contrato.moneda} ${contrato.salario_pactado.toLocaleString()}` : "sin contrato vigente"}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <CrearPersonaForm empresaId={empresaId} />
    </div>
  );
}
