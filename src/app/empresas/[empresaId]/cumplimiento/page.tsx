import { notFound } from "next/navigation";
import { obtenerEmpresa } from "@/cores/core-1-estructura/queries";
import {
  listarAlertasPendientes,
  listarInstanciasPendientesOVencidas,
  listarObligaciones,
  obtenerDocumentosRequeridos,
} from "@/cores/core-8-cumplimiento/queries";
import { listarPersonas } from "@/cores/core-3-personas/queries";
import { atenderAlertaAction } from "./actions";
import { AgregarDocumentoRequeridoForm, CrearInstanciaForm, CrearObligacionForm, RegistrarAccionInline } from "./forms";

export default async function CumplimientoPage({ params }: PageProps<"/empresas/[empresaId]/cumplimiento">) {
  const { empresaId } = await params;

  const empresa = await obtenerEmpresa(empresaId);
  if (!empresa) notFound();

  const [obligaciones, instancias, alertas, personas] = await Promise.all([
    listarObligaciones(empresaId),
    listarInstanciasPendientesOVencidas(empresaId),
    listarAlertasPendientes(empresaId),
    listarPersonas(empresaId),
  ]);
  const documentosRequeridosPorObligacion = await Promise.all(obligaciones.map((o) => obtenerDocumentosRequeridos(o.id)));

  const obligacionPorId = new Map(obligaciones.map((o) => [o.id, o]));

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="text-xl font-semibold">Cumplimiento — {empresa.razon_social}</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          CORE 8 — cadena de control: requerimiento → responsable → fecha → acción → evidencia → estatus → riesgo. Demostrar
          que se cumplió, no el CÓMO (eso es CORE 6).
        </p>
      </div>

      {alertas.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="font-medium text-red-700 dark:text-red-400">Alertas pendientes ({alertas.length})</h2>
          <ul className="flex flex-col gap-2">
            {alertas.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between rounded border border-red-200 bg-red-50 px-3 py-2 text-sm dark:border-red-900 dark:bg-red-950/40"
              >
                <span>{a.mensaje}</span>
                <form action={atenderAlertaAction} className="flex items-center gap-1">
                  <input type="hidden" name="empresaId" value={empresaId} />
                  <input type="hidden" name="alertaId" value={a.id} />
                  <select name="atendidaPor" required defaultValue="" className="rounded border border-zinc-300 bg-transparent px-2 py-1 text-xs dark:border-zinc-700">
                    <option value="" disabled>
                      Atendida por...
                    </option>
                    {personas.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombres} {p.apellido_paterno}
                      </option>
                    ))}
                  </select>
                  <button type="submit" className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900">
                    Atender
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-4">
        <h2 className="font-medium">Instancias pendientes o vencidas ({instancias.length})</h2>
        {instancias.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">No hay instancias pendientes ni vencidas.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {instancias.map((inst) => (
              <li key={inst.id} className="flex flex-col gap-2 px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{obligacionPorId.get(inst.obligacion_id)?.nombre ?? inst.obligacion_id.slice(0, 8)}</span>
                  <span
                    className={
                      inst.estatus === "vencido"
                        ? "text-red-600 dark:text-red-400"
                        : "text-zinc-500 dark:text-zinc-400"
                    }
                  >
                    {inst.estatus} · límite {inst.fecha_limite}
                  </span>
                </div>
                <RegistrarAccionInline empresaId={empresaId} instanciaId={inst.id} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-medium">Obligaciones y documentos requeridos</h2>
        {obligaciones.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Todavía no hay obligaciones registradas.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {obligaciones.map((o, i) => (
              <li key={o.id} className="flex flex-col gap-1 px-4 py-3">
                <span className="font-medium">
                  {o.nombre} {o.categoria ? `(${o.categoria})` : ""} · {o.periodicidad} · riesgo {o.riesgo_nivel_inherente}
                </span>
                {documentosRequeridosPorObligacion[i].length > 0 && (
                  <ul className="ml-4 list-disc text-sm text-zinc-600 dark:text-zinc-400">
                    {documentosRequeridosPorObligacion[i].map((d) => (
                      <li key={d.id}>
                        {d.nombre}
                        {!d.obligatorio ? " (opcional)" : ""}
                        {d.descripcion ? ` — ${d.descripcion}` : ""}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
        <AgregarDocumentoRequeridoForm empresaId={empresaId} obligaciones={obligaciones} />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-medium">Nueva obligación</h2>
        <CrearObligacionForm empresaId={empresaId} />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-medium">Nueva instancia (ocurrencia de una obligación)</h2>
        <CrearInstanciaForm empresaId={empresaId} obligaciones={obligaciones} personas={personas} />
      </section>
    </div>
  );
}
