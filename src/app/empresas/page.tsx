import Link from "next/link";
import { listarEmpresas } from "@/cores/core-1-estructura/queries";
import { CrearEmpresaForm } from "./crear-empresa-form";

export default async function EmpresasPage() {
  const empresas = await listarEmpresas();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold">Empresas</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          CORE 1 — Estructura Organizacional. Punto de entrada: todo lo demás se consulta a partir de una empresa.
        </p>
      </div>

      {empresas.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Todavía no hay empresas registradas en esta instancia.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {empresas.map((empresa) => (
            <li key={empresa.id}>
              <Link
                href={`/empresas/${empresa.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-zinc-100 dark:hover:bg-zinc-900"
              >
                <span className="font-medium">{empresa.razon_social}</span>
                <span className="text-sm text-zinc-500 dark:text-zinc-400">
                  {empresa.nombre_comercial ?? empresa.rfc ?? ""}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <CrearEmpresaForm />
    </div>
  );
}
