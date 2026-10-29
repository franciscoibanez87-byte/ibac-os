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
