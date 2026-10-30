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

### Primeras páginas de Next.js (2026-10-29)

Arrancó la capa de UI consumiendo la capa de TypeScript ya construida para los 8 COREs y los 3 servicios transversales. Dos decisiones de arquitectura quedaron fijadas en este punto:

1. **Cliente Supabase con `service_role`, solo en servidor.** Todavía no existe autenticación de usuarios finales, y las políticas RLS de cada migración son deliberadamente restrictivas ("Escritura: por ahora solo via service_role, hasta definir matriz de permisos por rol") — ni siquiera las lecturas pasan con el rol `authenticated`, porque nadie está autenticado. `src/lib/supabase-admin.ts` expone ese cliente protegido con el paquete `server-only` (cualquier intento de importarlo desde un Client Component falla en build time, no en producción), y las 11 `queries.ts` (8 COREs + 3 transversales) ya importan de ahí en vez del cliente anon. Mientras no exista auth, Next.js actúa como backend de confianza: toda lectura y escritura pasa por Server Components y Server Actions, nunca desde el navegador.
2. **`export const instant = false` en el layout raíz.** Con `cacheComponents` habilitado (experimental de Next.js 16), cada ruta debe producir un "static shell" o declarar explícitamente que puede bloquear la navegación. Como todo IBAC OS lee datos en vivo de Supabase en cada request, se declaró una sola vez en el layout raíz en vez de en cada página.

Primer CORE con UI funcional de punta a punta: **CORE 1 — Estructura Organizacional** (`/empresas`, `/empresas/[empresaId]`): listar/crear empresas, sedes, árbol de unidades organizacionales con sus plazas, y asignar/finalizar la ocupación de una plaza, con Server Actions que respetan las mismas invariantes que ya protege la base de datos (p. ej. `crearAsignacion` falla con un mensaje claro si la plaza ya tiene titular activo, en vez de reintentar a ciegas).

### Páginas de los 7 COREs restantes + nav por empresa (2026-10-29)

Con el patrón de CORE 1 ya probado (Server Components para lectura, Server Actions para escritura, el cliente `service_role`), se construyeron las páginas de todo lo que faltaba, todas bajo `/empresas/[empresaId]/...` y con un nav (`empresa-nav.tsx`) que las conecta:

- **`/puestos`** (CORE 2): catálogo de puestos y su banda salarial vigente; registrar/revisar banda vía `registrarBandaSalarial`.
- **`/personas`** y **`/personas/[personaId]`** (CORE 3 + CORE 4): expedientes, con su ocupación vigente (CORE 1) y su contrato/historial salarial (CORE 4) resueltos por referencia — nunca duplicados. Registrar/revisar contrato vía `registrarContrato`.
- **`/politicas`** y **`/procedimientos`** (CORE 5 y 6): ciclo de vida del Motor de Objeto Gobernado (borrador → aprobado → publicado → archivado) con controles inline reutilizables (`lifecycle-buttons.tsx`, `lifecycle-actions.ts`).
- **`/indicadores`** (CORE 7): catálogo de indicadores y registro de resultados medidos por período.
- **`/cumplimiento`** (CORE 8): obligaciones, instancias pendientes/vencidas con registro de acción inline, y alertas pendientes.

Dos huecos reales en la capa de consultas, descubiertos al construir la UI (no todo CORE tenía una función `crear*` básica), se corrigieron antes de usarlos: se agregó `crearPuesto` (CORE 2) y `crearPersona` (CORE 3), además de `listarTodasLasPoliticas` (CORE 5) y `listarProcedimientos` (CORE 6) para poder administrar el ciclo de vida completo, no solo las versiones ya vigentes.

Validado con `tsc --noEmit`, `eslint` y `next build` limpios para las 13 rutas, y un smoke test con `next dev` confirmando que las 9 páginas nuevas llegan hasta el cliente Supabase sin errores de wiring (fallan únicamente por no haber una instancia real configurada en este entorno).

### Piezas que quedaban fuera de la primera pasada (2026-10-29)

Completado lo que faltaba de la UI de los COREs ya construidos:

- **Detalle de puesto** (`/puestos/[puestoId]`, CORE 2): condiciones inherentes al rol (upsert — no tiene historial, a diferencia de la banda salarial) y KPIs del puesto (meta). Se agregaron `guardarCondicionesInherentes` y `crearKpiPuesto` a `queries.ts`, que no existían.
- **Detalle de persona** (CORE 3), tres secciones nuevas:
  - **Historial de movimientos** (EventoMovimiento transversal) + registrar uno nuevo. El formulario es deliberadamente simple (no captura plaza anterior/nueva) — para un movimiento que involucre una plaza, se complementa con Estructura (CORE 1).
  - **Evidencia de asistencia** (CORE 8) + registrar una nueva.
  - **Documentos** (Gestión Documental transversal): subir un documento y asociarlo a la persona. Como no hay integración con Supabase Storage todavía, el formulario pide la `storage_path` directamente — no sube un archivo real.
- **Documentos requeridos por obligación** (`/cumplimiento`, CORE 8): cada obligación ahora muestra y permite agregar los documentos que exige (la exigencia, no la evidencia entregada).

Validado igual que las pasadas anteriores: `tsc --noEmit`, `eslint` y `next build` limpios para las 14 rutas, y smoke test con `next dev` sin errores de código en ninguna ruta.

### Subida real de archivos a Supabase Storage (2026-10-29)

El formulario de documentos de persona pedía la `storage_path` a mano porque nunca existió un bucket real donde apuntara — se cerró esa brecha:

- **`0015_transversal_storage_documentos.sql`**: crea el bucket privado `documentos` (`public = false`) y su política de lectura `authenticated`. Es la primera migración del proyecto con una dependencia real de la plataforma Supabase (el esquema `storage` no existe en Postgres plano), así que va envuelta en un `do $$ if exists (schema 'storage') then ... end if; end $$;` — no-op contra el harness de pruebas local (`supabase/tests/run.sh`).
- **`transversal/documentos/queries.ts`**: `subirDocumentoConArchivo` y `subirNuevaVersionDocumentoConArchivo` suben el archivo real al bucket y después registran los metadatos con las RPCs existentes (`subirDocumento`/`subirNuevaVersionDocumento`); si el registro falla, se borra el archivo huérfano del bucket antes de relanzar el error — nunca queda un archivo sin fila que lo referencie. `obtenerUrlDescarga` da una URL firmada de corta duración (5 min por defecto) — el bucket es privado, nunca hay URL pública directa.
- **Detalle de persona**: el formulario de documentos ahora tiene un `<input type="file">` real en vez del campo de texto `storagePath`, y cada documento listado muestra un enlace "Descargar" con su URL firmada.

Validado igual que las pasadas anteriores: `tsc --noEmit`, `eslint` y `next build` limpios, y smoke test con `next dev` sin errores de código en ninguna ruta.

### Primer proyecto Supabase real + hardening de permisos (2026-10-29)

Se creó el primer proyecto Supabase real del repo (`ibac-os-dev`, org IBAC — proyecto de desarrollo/demo, no la instancia de ningún cliente) y se corrieron las 15 migraciones existentes contra él por primera vez, sin errores.

El linter de seguridad de Supabase (solo disponible contra una plataforma real, no contra el harness de pruebas local) encontró un hallazgo real: las 8 RPCs de escritura (`registrar_contrato`, `subir_documento`, `publicar_objeto_gobernado`, etc.) y 4 vistas derivadas (`historial_salarial` entre ellas) eran ejecutables/legibles por los roles `anon`/`authenticated` vía PostgREST — Postgres otorga `EXECUTE` a `PUBLIC` por defecto, y nunca se había aplicado el `REVOKE` explícito porque hasta ahora no existía un proyecto real contra el cual verificarlo. Esto ya estaba señalado como decisión pendiente en el diseño ("escritura reservada a service_role hasta definir matriz de permisos por rol"), pero quedaba expuesto en la práctica.

- **`0016_hardening_rpcs_vistas_solo_service_role.sql`**: revoca `EXECUTE` de esas 8 RPCs a `public`/`anon`/`authenticated` y lo otorga solo a `service_role`; pone `security_invoker = true` en las 4 vistas para que respeten el RLS de quien consulta en vez de correr con los privilegios de quien las creó. El `REVOKE` de `anon` es condicional (`if exists (select 1 from pg_roles where rolname = 'anon')`) porque ese rol solo existe en una plataforma Supabase real — el harness de pruebas local (Postgres plano) no lo tiene, solo `authenticated` y `service_role`.
- Verificado: `bash supabase/tests/run.sh` sigue pasando completo (incluida la prueba de concurrencia) con la migración 0016 incluida, y el linter de seguridad del proyecto real queda en cero hallazgos. La app nunca se vio afectada porque siempre usa `service_role` (`src/lib/supabase-admin.ts`), nunca `anon`/`authenticated`.

### Autenticación de staff/RH (2026-10-29)

Hasta ahora la app no tenía login: cualquiera con la URL veía todo. Se agregó Supabase Auth con email + contraseña, con un alcance deliberadamente acotado — es la puerta de entrada, no la matriz de permisos (eso sigue pendiente, ver "Reglas de oro"/auditoría):

- **Quién entra**: solo staff de RH/consultores (tú y el equipo de RH de cada cliente). No hay autoservicio de empleados todavía, y no hay signup público — las cuentas se crean a mano desde el dashboard de Supabase (ver "Desarrollo" abajo).
- **`src/proxy.ts`** (en Next.js 16, `middleware.ts` se renombró a `proxy.ts` — mismo mecanismo): protege toda la app. Sin sesión, redirige a `/login`; con sesión, `/login` redirige a `/empresas`. Hace el redirect en el borde, antes de que cualquier página corra.
- **`src/lib/supabase-server.ts`** / **`src/lib/supabase-browser.ts`**: clientes de Supabase *con sesión* (cookies, anon key) — distintos de `supabase-admin.ts` (service_role, sin sesión). Estos nuevos clientes se usan solo para login/logout/mostrar el usuario; ninguna query de datos de negocio (CORE 1-8) pasó a usarlos — siguen yendo 100% por `service_role`, igual que antes.
- **`/login`**: formulario de correo + contraseña (Server Action `loginAction`), mensaje de error genérico ("correo o contraseña incorrectos") para no filtrar qué correos tienen cuenta.
- **Logout**: botón en el header del layout raíz, junto al correo del usuario autenticado.
- Alcance explícitamente NO cubierto por esta pasada (decisión del usuario): cualquier usuario autenticado sigue viendo exactamente lo mismo que veía antes — el RLS de las tablas sigue siendo el placeholder permisivo de siempre. Diseñar qué puede ver/hacer cada rol (RH, Nómina, Jefatura...) es un paso aparte, ya identificado en la auditoría de arquitectura.

Validado: `tsc --noEmit`, `eslint` y `next build` limpios (el aviso de deprecación de `middleware.ts` → `proxy.ts` de Next.js 16 ya quedó resuelto renombrando el archivo), y smoke test con `next dev` confirmando que `/login` carga sin sesión y que una ruta protegida (`/empresas`) redirige a `/login` con 307.

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
cp .env.example .env.local   # completa con la instancia Supabase de este cliente
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) — sin sesión, redirige a `/login`.

`SUPABASE_SERVICE_ROLE_KEY` (en `.env.local`, nunca con prefijo `NEXT_PUBLIC_`) es obligatoria: toda la app lee y escribe con ese cliente desde el servidor (ver "Primeras páginas de Next.js" arriba).

### Crear el primer usuario de staff

No hay signup público (ver "Autenticación de staff/RH" arriba). Para poder entrar:

1. En el dashboard de Supabase del proyecto → **Authentication → Users → Add user**.
2. Captura el correo y una contraseña, y marca **Auto Confirm User** (si no, el usuario queda sin confirmar y no puede iniciar sesión hasta click en un correo de confirmación que esta app todavía no envía).
3. Entra con ese correo/contraseña en `/login`.

Recomendado además, en **Authentication → Providers → Email**: desactivar "Allow new users to sign up" — como no hay página de registro en la app, ese endpoint solo queda expuesto por si alguien lo llama directamente con la anon key.

## Pruebas de base de datos

```bash
bash supabase/tests/run.sh
```

Levanta una BD Postgres de pruebas desechable, corre las 14 migraciones y ejecuta ~39 aserciones (casos que deben tener éxito y casos que deben fallar) sobre cada CORE y servicio transversal, incluida una prueba de concurrencia real para el fix de integridad de 0013. Sale con código 0 si todo pasa, 1 si algo falla — correr después de tocar cualquier migración o función de la BD, no solo cuando algo "se ve raro".
