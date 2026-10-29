"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const SECCIONES = [
  { href: "", label: "Estructura" },
  { href: "/puestos", label: "Puestos" },
  { href: "/personas", label: "Personas" },
  { href: "/politicas", label: "Políticas" },
  { href: "/procedimientos", label: "Procedimientos" },
  { href: "/indicadores", label: "Indicadores" },
  { href: "/cumplimiento", label: "Cumplimiento" },
];

export function EmpresaNav({ empresaId }: { empresaId: string }) {
  const pathname = usePathname();
  const base = `/empresas/${empresaId}`;

  return (
    <nav className="flex flex-wrap gap-2 border-b border-zinc-200 pb-4 dark:border-zinc-800">
      {SECCIONES.map((s) => {
        const href = `${base}${s.href}`;
        const activa = pathname === href;
        return (
          <Link
            key={s.href}
            href={href}
            className={
              activa
                ? "rounded-full bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-zinc-50 dark:text-zinc-900"
                : "rounded-full border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
            }
          >
            {s.label}
          </Link>
        );
      })}
    </nav>
  );
}
