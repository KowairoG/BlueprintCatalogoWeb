import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESION, verificarSesion } from "@/lib/session";

/**
 * Chequeo optimista: si alguien entra a /admin sin cookie válida, lo mandamos
 * al login sin llegar a renderizar nada.
 *
 * Esto NO es la autorización del sistema. La barrera real está en
 * src/lib/guards.ts, que verifica contra la base de datos y la llaman todas
 * las páginas y server actions del panel.
 *
 * (En Next.js 16 este archivo se llama `proxy.ts`; antes era `middleware.ts`.)
 */
export async function proxy(request: NextRequest) {
  const token = request.cookies.get(COOKIE_SESION)?.value;
  const sesion = await verificarSesion(token);

  const { pathname, search } = request.nextUrl;

  if (pathname.startsWith("/admin") && !sesion) {
    const login = new URL("/login", request.url);
    // Se recuerda a dónde iba para devolverlo ahí después de entrar.
    login.searchParams.set("destino", pathname + search);
    return NextResponse.redirect(login);
  }

  // Si ya tiene sesión, el login no tiene nada que ofrecerle.
  if (pathname === "/login" && sesion) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/login"],
};
