import { EmpresaNav } from "./empresa-nav";

export default async function EmpresaLayout({
  children,
  params,
}: LayoutProps<"/empresas/[empresaId]">) {
  const { empresaId } = await params;

  return (
    <div className="flex flex-col gap-6">
      <EmpresaNav empresaId={empresaId} />
      {children}
    </div>
  );
}
