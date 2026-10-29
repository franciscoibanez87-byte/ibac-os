import { notFound } from "next/navigation";
import { obtenerAsignacionesVigentesDePersona } from "@/cores/core-1-estructura/queries";
import { listarPersonas, obtenerPersona } from "@/cores/core-3-personas/queries";
import { obtenerContratoVigente, obtenerHistorialSalarial } from "@/cores/core-4-contratos/queries";
import { obtenerEvidenciaAsistenciaPersona } from "@/cores/core-8-cumplimiento/queries";
import { obtenerHistorialMovimientos } from "@/transversal/eventos/queries";
import { obtenerDocumentosDeEntidad, obtenerUrlDescarga } from "@/transversal/documentos/queries";
import {
  RegistrarContratoForm,
  RegistrarEvidenciaForm,
  RegistrarMovimientoForm,
  SubirDocumentoPersonaForm,
} from "./forms";

export default async function PersonaDetallePage({
  params,
}: PageProps<"/empresas/[empresaId]/personas/[personaId]">) {
  const { empresaId, personaId } = await params;

  const persona = await obtenerPersona(personaId);
  if (!persona) notFound();

  const [asignaciones, contratoVigente, historial, personas, evidencias, movimientos, documentos] = await Promise.all([
    obtenerAsignacionesVigentesDePersona(personaId),
    obtenerContratoVigente(personaId),
    obtenerHistorialSalarial(personaId),
    listarPersonas(empresaId),
    obtenerEvidenciaAsistenciaPersona(personaId),
    obtenerHistorialMovimientos(personaId),
    obtenerDocumentosDeEntidad("persona", personaId),
  ]);

  // URLs firmadas de corta duración — el bucket es privado, nunca hay una
  // URL pública directa. Si una falla (p. ej. el archivo ya no existe en
  // Storage), se omite el enlace en vez de romper la página.
  const urlsDescarga = await Promise.all(
    documentos.map(async (d) => {
      try {
        return await obtenerUrlDescarga(d.storage_path);
      } catch {
        return null;
      }
    })
  );

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

      <section className="flex flex-col gap-4">
        <h2 className="font-medium">Historial de movimientos (EventoMovimiento)</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Hecho único que se registra una sola vez; CORE 1, 3 y 4 lo consumen por referencia.
        </p>
        {movimientos.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Sin movimientos registrados.</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {movimientos.map((m) => (
              <li key={m.id}>
                {m.fecha_efectiva} — {m.tipo}
                {m.motivo ? ` — ${m.motivo}` : ""}
              </li>
            ))}
          </ul>
        )}
        <RegistrarMovimientoForm empresaId={empresaId} personaId={personaId} />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-medium">Evidencia de asistencia (CORE 8)</h2>
        {evidencias.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Sin evidencia registrada.</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {evidencias.map((e) => (
              <li key={e.id}>
                {e.fecha} — {e.tipo_evento}
                {e.justificacion ? ` — ${e.justificacion}` : ""}
              </li>
            ))}
          </ul>
        )}
        <RegistrarEvidenciaForm empresaId={empresaId} personaId={personaId} />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-medium">Documentos (Gestión Documental)</h2>
        {documentos.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Sin documentos asociados.</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {documentos.map((d, i) => (
              <li key={d.id} className="flex items-center gap-2">
                <span>
                  {d.nombre} (v{d.version}){d.categoria ? ` — ${d.categoria}` : ""}
                </span>
                {urlsDescarga[i] && (
                  <a
                    href={urlsDescarga[i]!}
                    className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
                  >
                    Descargar
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
        <SubirDocumentoPersonaForm empresaId={empresaId} personaId={personaId} />
      </section>
    </div>
  );
}
