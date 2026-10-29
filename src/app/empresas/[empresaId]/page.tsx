import { notFound } from "next/navigation";
import {
  listarPlazas,
  listarSedes,
  listarUnidadesOrganizacionales,
  obtenerAsignacionesActivas,
  obtenerEmpresa,
} from "@/cores/core-1-estructura/queries";
import type { Asignacion, Plaza, UnidadOrganizacional } from "@/cores/core-1-estructura/types";
import { listarPersonas } from "@/cores/core-3-personas/queries";
import { listarPuestos } from "@/cores/core-2-puestos/queries";
import {
  CrearAsignacionForm,
  CrearPlazaForm,
  CrearSedeForm,
  CrearUnidadForm,
  FinalizarAsignacionButton,
} from "./forms";

export default async function EmpresaDetallePage({
  params,
}: PageProps<"/empresas/[empresaId]">) {
  const { empresaId } = await params;

  const empresa = await obtenerEmpresa(empresaId);
  if (!empresa) notFound();

  const [sedes, unidades, plazas, personas, puestos] = await Promise.all([
    listarSedes(empresaId),
    listarUnidadesOrganizacionales(empresaId),
    listarPlazas(empresaId),
    listarPersonas(empresaId),
    listarPuestos(empresaId),
  ]);

  const asignacionesPorPlaza = new Map<string, Asignacion[]>(
    await Promise.all(
      plazas.map(async (plaza) => [plaza.id, await obtenerAsignacionesActivas(plaza.id)] as const)
    )
  );

  const puestoPorId = new Map(puestos.map((p) => [p.id, p]));
  const personaPorId = new Map(personas.map((p) => [p.id, p]));

  const unidadesPorPadre = new Map<string | null, UnidadOrganizacional[]>();
  for (const unidad of unidades) {
    const key = unidad.unidad_padre_id;
    unidadesPorPadre.set(key, [...(unidadesPorPadre.get(key) ?? []), unidad]);
  }

  const plazasPorUnidad = new Map<string, Plaza[]>();
  for (const plaza of plazas) {
    plazasPorUnidad.set(plaza.unidad_organizacional_id, [
      ...(plazasPorUnidad.get(plaza.unidad_organizacional_id) ?? []),
      plaza,
    ]);
  }

  function renderUnidad(unidad: UnidadOrganizacional, nivel: number) {
    const hijos = unidadesPorPadre.get(unidad.id) ?? [];
    const plazasDeUnidad = plazasPorUnidad.get(unidad.id) ?? [];

    return (
      <div key={unidad.id} style={{ marginLeft: nivel * 16 }} className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="rounded bg-zinc-200 px-2 py-0.5 text-xs uppercase tracking-wide dark:bg-zinc-800">
            {unidad.tipo}
          </span>
          <span className="font-medium">{unidad.nombre}</span>
        </div>

        {plazasDeUnidad.length > 0 && (
          <ul className="ml-4 flex flex-col gap-1 border-l border-zinc-200 pl-4 dark:border-zinc-800">
            {plazasDeUnidad.map((plaza) => {
              const activas = asignacionesPorPlaza.get(plaza.id) ?? [];
              const puesto = plaza.puesto_id ? puestoPorId.get(plaza.puesto_id) : undefined;
              return (
                <li key={plaza.id} className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-zinc-500 dark:text-zinc-400">
                    Plaza {plaza.codigo ?? plaza.id.slice(0, 8)} — {puesto?.nombre ?? "(sin puesto)"} ·{" "}
                    <span className="italic">{plaza.estado}</span>
                  </span>
                  {activas.length === 0 ? (
                    <span className="text-zinc-400 dark:text-zinc-500">sin ocupante</span>
                  ) : (
                    activas.map((asig) => (
                      <span key={asig.id} className="flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                        {personaPorId.get(asig.persona_id)?.nombres ?? asig.persona_id.slice(0, 8)}{" "}
                        {personaPorId.get(asig.persona_id)?.apellido_paterno ?? ""} ({asig.tipo})
                        <FinalizarAsignacionButton empresaId={empresaId} asignacionId={asig.id} />
                      </span>
                    ))
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {hijos.length > 0 && (
          <div className="flex flex-col gap-2">
            {hijos.map((hijo) => renderUnidad(hijo, nivel + 1))}
          </div>
        )}
      </div>
    );
  }

  const unidadesRaiz = unidadesPorPadre.get(null) ?? [];
  const plazasSinOcupante = plazas.filter((p) => (asignacionesPorPlaza.get(p.id) ?? []).length === 0);

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="text-xl font-semibold">{empresa.razon_social}</h1>
        {empresa.nombre_comercial && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{empresa.nombre_comercial}</p>
        )}
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="font-medium">Sedes ({sedes.length})</h2>
        <ul className="flex flex-wrap gap-2">
          {sedes.map((s) => (
            <li key={s.id} className="rounded-full border border-zinc-300 px-3 py-1 text-sm dark:border-zinc-700">
              {s.nombre}
              {s.ciudad ? ` · ${s.ciudad}` : ""}
            </li>
          ))}
        </ul>
        <CrearSedeForm empresaId={empresaId} />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-medium">Estructura organizacional y plazas</h2>
        {unidadesRaiz.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Todavía no hay unidades organizacionales registradas.
          </p>
        ) : (
          <div className="flex flex-col gap-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
            {unidadesRaiz.map((u) => renderUnidad(u, 0))}
          </div>
        )}
        <CrearUnidadForm empresaId={empresaId} sedes={sedes} unidades={unidades} />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-medium">Agregar plaza</h2>
        <CrearPlazaForm empresaId={empresaId} unidades={unidades} puestos={puestos} />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-medium">Asignar persona a plaza</h2>
        {plazasSinOcupante.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No hay plazas sin ocupante en este momento.
          </p>
        ) : (
          <CrearAsignacionForm empresaId={empresaId} plazas={plazasSinOcupante} personas={personas} />
        )}
      </section>
    </div>
  );
}
