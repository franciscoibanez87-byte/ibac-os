# IBAC OS

Sistema de RH para PyMEs/empresas medianas (20-500 empleados), diseñado y desarrollado por José Ibáñez (IBAC Consultores).

## Arquitectura

8 CORE obligatorios + módulos especializados activables + servicios transversales.

- **CORE 1** — Estructura Organizacional
- **CORE 2** — Puestos
- **CORE 3** — Personas / Expedientes
- **CORE 4** — Contratos
- **CORE 5** — Políticas
- **CORE 6** — Procedimientos
- **CORE 7** — Indicadores
- **CORE 8** — Cumplimiento

## Stack

- Next.js (frontend + backend)
- Supabase (Postgres + Auth + RLS)
- Despliegue: Cloudflare Pages / Vercel
- Una instancia Supabase por cliente (no multi-tenant compartido)
