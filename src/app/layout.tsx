import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { createClient } from "@/lib/supabase-server";
import { logoutAction } from "./logout-action";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "IBAC OS",
  description: "Sistema operativo de RH para PyMEs — IBAC Consultores",
};

// Todas las páginas de IBAC OS leen datos en vivo de Supabase en cada
// request (plazas, asignaciones, cumplimiento...) — no hay contenido
// genuinamente estático que valga la pena precalcular. Con
// `cacheComponents` habilitado (next.config.ts), Next.js exige que cada
// ruta produzca un "static shell" o declare explícitamente que puede
// bloquear la navegación; como eso aplica a todo el árbol de rutas, se
// declara una sola vez aquí en el layout raíz en vez de en cada página.
export const instant = false;

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // El middleware ya garantiza que, fuera de /login, siempre hay sesión —
  // esta lectura es solo para mostrar quién entró y el botón de salir,
  // nunca para decidir acceso (eso lo hace el middleware).
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-zinc-50 text-zinc-900 dark:bg-black dark:text-zinc-50">
        <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
            <Link href="/empresas" className="font-semibold tracking-tight">
              IBAC OS
            </Link>
            <div className="flex items-center gap-4">
              <span className="text-sm text-zinc-500 dark:text-zinc-400">
                IBAC Consultores
              </span>
              {user && (
                <form action={logoutAction} className="flex items-center gap-3">
                  <span className="text-sm text-zinc-500 dark:text-zinc-400">{user.email}</span>
                  <button
                    type="submit"
                    className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
                  >
                    Cerrar sesión
                  </button>
                </form>
              )}
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
