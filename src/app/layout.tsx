import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
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

export default function RootLayout({ children }: LayoutProps<"/">) {
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
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              IBAC Consultores
            </span>
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
