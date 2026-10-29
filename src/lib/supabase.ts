import { createClient } from "@supabase/supabase-js";

// Cada cliente de IBAC OS corre su propia instancia de Supabase
// (aislamiento total, no multi-tenant compartido). Estas variables
// de entorno apuntan a la instancia de ESTE cliente específico.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Faltan NEXT_PUBLIC_SUPABASE_URL y/o NEXT_PUBLIC_SUPABASE_ANON_KEY. Copia .env.example a .env.local y completa los valores de la instancia Supabase de este cliente."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
