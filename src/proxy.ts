import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Protege toda la app detrás de login. IBAC OS hoy no tiene signup
// público — las cuentas de staff/RH se crean desde el dashboard de
// Supabase (ver README) — así que la única entrada sin sesión válida es
// /login. El resto de las políticas de acceso (qué puede ver cada rol)
// quedan igual que antes: RLS permisivo + lecturas/escrituras de datos
// vía service_role desde el backend. Esto solo agrega la puerta de
// entrada; la matriz de permisos por rol es un paso aparte, ya planeado.
//
// Nota de nomenclatura: en Next.js 16 este archivo se llama `proxy.ts`
// (antes `middleware.ts`) y la función se exporta como `proxy` — mismo
// mecanismo, solo cambió el nombre (ver node_modules/next/dist/docs/
// 01-app/01-getting-started/16-proxy.md).
export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANTE: no quitar esta llamada. Es la que efectivamente refresca
  // el token de sesión (y por lo tanto las cookies) en cada request.
  const { data: { user } } = await supabase.auth.getUser();

  const esLogin = request.nextUrl.pathname.startsWith("/login");

  if (!user && !esLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && esLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/empresas";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    // Corre en todo excepto assets estáticos de Next y el favicon — esos
    // no necesitan sesión ni deben disparar un redirect.
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
