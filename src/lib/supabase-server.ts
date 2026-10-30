import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Cliente de Supabase CON sesión (cookies), para usar en Server Components
// y Server Actions cuando se necesita saber quién está autenticado (login,
// logout, mostrar el usuario en el nav) — distinto de supabase-admin.ts
// (service_role, sin sesión, usado para TODAS las lecturas/escrituras de
// datos de negocio). No confundir los dos: este cliente nunca se usa para
// leer/escribir CORE 1-8, solo para el estado de autenticación en sí.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Se llamó desde un Server Component (no puede escribir
            // cookies); el middleware ya se encarga de refrescar la
            // sesión en cada request, así que esto es seguro de ignorar.
          }
        },
      },
    }
  );
}
