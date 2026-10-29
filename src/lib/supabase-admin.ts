import "server-only";
import { createClient } from "@supabase/supabase-js";

// Cliente de Supabase con la service_role key — SOLO se ejecuta en el
// servidor (Server Components, Server Actions, Route Handlers).
//
// Por qué: todavía no existe autenticación de usuarios finales en IBAC OS
// y las políticas RLS de cada migración son deliberadamente restrictivas
// ("Escritura: por ahora solo via service_role (backend), hasta definir
// matriz de permisos por rol"). Mientras eso no exista, ni siquiera las
// lecturas pasan con el rol "authenticated" de Postgres, porque nadie está
// autenticado. Next.js actúa entonces como el backend de confianza: lee y
// escribe con service_role, que ignora RLS por completo.
//
// La importación de "server-only" hace que cualquier intento de importar
// este archivo desde un Client Component ('use client') falle en build
// time, no en producción — es la barrera que evita que la service_role
// key termine en el bundle de JavaScript que llega al navegador.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error(
    "Faltan NEXT_PUBLIC_SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY. Copia .env.example a .env.local y completa los valores de la instancia Supabase de este cliente. SUPABASE_SERVICE_ROLE_KEY NUNCA debe llevar el prefijo NEXT_PUBLIC_."
  );
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    // No hay sesión de usuario que persistir: este cliente vive solo
    // durante la ejecución de una request en el servidor.
    persistSession: false,
  },
});
