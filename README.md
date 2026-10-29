# IBAC OS

Sistema de RH para PyMEs/empresas medianas (20-500 empleados), diseñado y desarrollado por José Ibáñez (IBAC Consultores).

## Arquitectura

**CORE obligatorio + Subsistemas activables + Servicios Transversales**

- CORE = infraestructura estructural indispensable y fuente de verdad.
- Subsistema = capacidad especializada activable (Reclutamiento, Capacitación, Desempeño, DO, Clima, Onboarding, Nómina, Relaciones Laborales) que consume datos de los COREs pero nunca crea una fuente paralela de verdad.
- Servicio Transversal = infraestructura compartida (Gestión Documental, Motor de Objeto Gobernado).

### Los 8 CORE

| CORE | Dominio |
|---|---|
| CORE 1 | Estructura Organizacional |
| CORE 2 | Puestos |
| CORE 3 | Personas / Expedientes |
| CORE 4 | Contratos |
| CORE 5 | Políticas |
| CORE 6 | Procedimientos |
| CORE 7 | Indicadores |
| CORE 8 | Cumplimiento |

### Reglas de oro

1. Cada dato estructural tiene un único propietario; los demás COREs solo lo consultan, referencian o derivan.
2. Un hecho ocurre una sola vez en el sistema; las áreas pueden consumirlo, no replicarlo como hecho nuevo.
3. Los módulos/subsistemas agregan capacidades; no crean nuevas fuentes de verdad sobre datos CORE.

Ejemplos de fuente única de verdad ya resueltos en el diseño:
- **Salario**: Puesto (CORE 2) define banda de referencia; Contrato (CORE 4) es la única fuente del salario pactado y versionado; Persona (CORE 3) no almacena salario propio. Tanto la banda de referencia como el contrato versionan su ciclo de vida a través del Motor de Objeto Gobernado (`registrarBandaSalarial` / `registrarContrato`), no con columnas propias.
- **Asignación** (Persona↔Plaza↔Vigencia) vive en CORE 1, no en CORE 3.
- **EventoMovimiento** es una entidad transversal única: alta, baja, reingreso, promoción, transferencia, cambio de plaza, cambio contractual — se registra una sola vez y los COREs la consumen por referencia.
- **Indicador ≠ Meta ≠ Resultado**: la definición general del indicador vive en CORE 7 (`indicador`); la META que fija un puesto en particular vive en CORE 2 (`kpi_puesto`); el RESULTADO medido vive en CORE 7 (`resultado_indicador`). Ninguna se fusiona con las otras.
- **CORE 8 (Cumplimiento) no usa el Motor de Objeto Gobernado**: sus registros son operativos (seguimiento de obligaciones con estatus propio), no documentos normativos versionados. La frontera con CORE 6 es explícita: Procedimiento = cómo se ejecuta; Cumplimiento = demostrar que se cumplió.
- **Gestión Documental** (transversal) tampoco usa el Motor de Objeto Gobernado: un documento almacenado tiene versiones sucesivas con una "vigente" (patrón propio `documento_logico_id`/`version`/`vigente`), no un ciclo normativo borrador→aprobado→publicado. Resuelve las FKs lógicas pendientes de `cumplimiento_instancia.evidencia_documento_id` y `evidencia_asistencia.evidencia_documento_id`.
- **EventoMovimiento** (transversal) es el hecho único detrás de alta, baja, reingreso, promoción, transferencia, cambio de plaza y cambio contractual. Resuelve la FK lógica pendiente de `asignacion.evento_movimiento_id` (CORE 1); CORE 3 y CORE 4 lo consumen por referencia.

### Correcciones de una auditoría (2026-10-29)

Antes de empezar las páginas de Next.js se auditó todo lo construido hasta ese punto. Hallazgos y su corrección:

1. **CORE 1 no tenía código TypeScript.** Se agregó `src/cores/core-1-estructura/` completo (empresa, sede, unidad_organizacional, plaza, asignación) — era el único CORE sin capa de aplicación.
2. **Hueco de integridad en salario/banda.** El refactor de 0008 había quitado la garantía "una persona/puesto no puede tener dos versiones vigentes a la vez" sin reemplazarla. La migración 0013 cierra esto con `pg_advisory_xact_lock` (serializa llamadas concurrentes por persona/puesto) + una aserción explícita en `registrar_contrato`/`registrar_banda_salarial` — validado con dos llamadas concurrentes reales.
3. **`ObjetoGobernadoTipo` en TS seguía sin `banda_salarial`/`contrato`**, desincronizado del CHECK que 0008 ya había ampliado en la BD. Corregido.
4. **`documento_asociacion`/`documento_permiso` apuntaban a una versión puntual**, no al documento lógico — una nueva versión dejaba huérfanas las asociaciones/permisos anteriores. La migración 0014 las mueve a `documento_logico_id` y agrega las vistas `documento_asociacion_vigente`/`documento_permiso_vigente` que resuelven siempre a la versión vigente.
5. **Fuga de tipo en CORE 8**: una consulta usaba el embedding automático de PostgREST, devolviendo un campo no declarado en el tipo. Reescrita como dos consultas, consistente con el resto del proyecto.

## Stack técnico

- **Frontend + Backend**: Next.js (App Router, TypeScript, Tailwind)
- **Base de datos**: Supabase (Postgres + Auth + Row Level Security)
- **Despliegue**: Cloudflare Pages / Vercel
- **Modelo de instancias**: una instancia Supabase separada por cliente (no multi-tenant compartido) — aislamiento total de datos entre clientes

## Estructura del repo

```
src/
  cores/
    core-1-estructura/     # Empresa, Sede, Área, Dirección, Jefatura, Plaza, Asignación
    core-2-puestos/        # Catálogo de puestos, perfiles, bandas salariales de referencia
    core-3-personas/       # Expedientes — sin salario propio
    core-4-contratos/      # Fuente única de verdad salarial, versiones históricas
    core-5-politicas/      # Regla → versión → aprobación → vigencia → publicación
    core-6-procedimientos/ # Flujos operativos (cómo se ejecuta algo)
    core-7-indicadores/    # Medición de resultados (consume de los demás COREs)
    core-8-cumplimiento/   # Obligaciones, documentación, vencimientos, riesgos, evidencia, alertas
  transversal/
    documentos/            # Gestión Documental (servicio compartido)
    objeto-gobernado/       # Motor de Objeto Gobernado (versión/aprobación/vigencia)
    eventos/                # EventoMovimiento
supabase/
  migrations/               # Migraciones SQL, una por CORE
```

## Desarrollo

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Pruebas de base de datos

```bash
bash supabase/tests/run.sh
```

Levanta una BD Postgres de pruebas desechable, corre las 14 migraciones y ejecuta ~39 aserciones (casos que deben tener éxito y casos que deben fallar) sobre cada CORE y servicio transversal, incluida una prueba de concurrencia real para el fix de integridad de 0013. Sale con código 0 si todo pasa, 1 si algo falla — correr después de tocar cualquier migración o función de la BD, no solo cuando algo "se ve raro".
