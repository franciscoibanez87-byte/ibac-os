import { createBrowserClient } from "@supabase/ssr";

// Cliente de Supabase para el navegador (anon key). Hoy no se usa en
// ningún Client Component porque el login/logout se hacen con Server
// Actions — queda disponible por si algún flujo futuro de auth (ej.
// restablecer contraseña) lo necesita directamente en el cliente.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
