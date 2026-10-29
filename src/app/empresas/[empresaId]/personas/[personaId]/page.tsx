import { notFound } from "next/navigation";
import { obtenerAsignacionesVigentesDePersona } from "@/cores/core-1-estructura/queries";
import { listarPersonas, obtenerPersona } from "@/cores/core-3-personas/queries";
import { obtenerContratoVigente, obtenerHistorialSalarial } from "@/cores/core-4-contratos/queries";
import { RegistrarContratoForm } from "./forms";

export default async function PersonaDetallePage({
  params,
}: PageProps<"/empresas/[empresaId]/personas/[personaId]">) {
  const { empresaId, personaId } = await params;

  const persona = await obtenerPersona(personaId);
  if (!persona) notFound();

  const [asignaciones, contratoVigente, historial, personas] = await Promise.all([
    obtenerAsignacionesVigentesDePersona(personaId),
    obtenerContratoVigente(personaId),
    obtenerHistorialSalarial(personaId),
    listarPersonas(empresaId),
  ]);

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="text-xl font-semibold">
          {persona.nombres} {persona.apellido_paterno} {persona.apellido_materno ?? ""}
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Expediente: {persona.estatus} · {persona.email_personal ?? "sin email"} · {persona.telefono ?? "sin teléfono"}
        </p>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="font-medium">Ocupación vigente (CORE 1)</h2>
        {asignaciones.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Sin asignación activa.</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {asignaciones.map((a) => (
              <li key={a.id}>
                Plaza {a.plaza_id.slice(0, 8)} · {a.tipo} · desde {a.fecha_inicio}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-medium">Contrato vigente (CORE 4 — fuente única del salario)</h2>
        {contratoVigente ? (
          <p className="text-sm">
            {contratoVigente.moneda} {contratoVigente.salario_pactado.toLocaleString()} · {contratoVigente.tipo_contrato} ·{" "}
            {contratoVigente.modalidad} · desde {contratoVigente.fecha_inicio}
          </p>
        ) : (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Sin contrato vigente.</p>
        )}

        {historial.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Historial salarial</h3>
            <ul className="flex flex-col gap-1 text-sm">
              {historial.map((h) => (
                <li key={h.version} className={h.es_version_vigente ? "font-medium" : "text-zinc-500 dark:text-zinc-400"}>
                  v{h.version} — {h.moneda} {h.salario_pactado.toLocaleString()}
                  {h.vigente_desde ? ` · desde ${h.vigente_desde}` : ""}
                  {h.vigente_hasta ? ` hasta ${h.vigente_hasta}` : h.es_version_vigente ? " (vigente)" : ""}
                  {h.motivo_modificacion ? ` — ${h.motivo_modificacion}` : ""}
                </li>
              ))}
            </ul>
          </div>
        )}

        <RegistrarContratoForm empresaId={empresaId} personaId={personaId} personas={personas} />
      </section>
    </div>
  );
}
