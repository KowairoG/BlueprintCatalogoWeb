import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESION } from "@/lib/session";

/**
 * Cierra la sesión borrando la cookie y manda al login.
 *
 * Existe para resolver un caso concreto: cuando a alguien le desactivan o le
 * borran la cuenta mientras tiene sesión abierta, su token sigue siendo
 * criptográficamente válido. `proxy.ts` lo deja pasar (solo verifica la firma)
 * pero `guards.ts` lo rechaza (consulta la base). Sin este paso intermedio, el
 * panel manda al login, el proxy ve el token válido y devuelve al panel: bucle
 * infinito de redirecciones.
 *
 * Acá se rompe el ciclo eliminando la cookie que ya no sirve.
 */
export async function GET(request: NextRequest) {
  const destino = request.nextUrl.searchParams.get("destino");

  const login = new URL("/login", request.url);
  if (destino && destino.startsWith("/") && !destino.startsWith("//")) {
    login.searchParams.set("destino", destino);
  }

  const respuesta = NextResponse.redirect(login);
  respuesta.cookies.delete(COOKIE_SESION);
  return respuesta;
}
