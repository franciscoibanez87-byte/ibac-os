import { LoginForm } from "./form";

// Única puerta de entrada sin sesión. No hay signup público — las cuentas
// de staff/RH se crean desde el dashboard de Supabase (ver README).
export default function LoginPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6">
      <div className="text-center">
        <h1 className="text-xl font-semibold">IBAC OS</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Inicia sesión para continuar.</p>
      </div>
      <LoginForm />
    </div>
  );
}
