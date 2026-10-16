import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/lib/db";
import { NoAutorizadoError } from "@/lib/errores";
import { COOKIE_SESION, verificarSesion, type Sesion } from "@/lib/session";

/**
 * Autorización real del panel.
 *
 * `proxy.ts` solo hace un chequeo optimista para redirigir rápido al login.
 * La barrera que cuenta es esta: la llaman todas las páginas del panel y
 * TODAS las server actions, porque una server action es un endpoint POST que
 * se puede invocar directamente sin pasar por la interfaz.
 */

export { NoAutorizadoError };

/**
 * Sesión del request actual, o null.
 *
 * Va envuelta en `cache()` para que varias llamadas dentro del mismo request
 * (layout + página + acción) no repitan la consulta a la base.
 */
export const sesionActual = cache(async (): Promise<Sesion | null> => {
  const token = (await cookies()).get(COOKIE_SESION)?.value;
  const sesion = await verificarSesion(token);
  if (!sesion) return null;

  // El token es válido, pero el usuario pudo haber sido desactivado o borrado
  // después de emitirlo. Sin esta verificación, desactivar a alguien no lo
  // sacaría del sistema hasta que venza su cookie.
  const usuario = await db.usuario.findUnique({
    where: { id: sesion.usuarioId },
    select: { id: true, email: true, nombre: true, rol: true, activo: true },
  });

  if (!usuario || !usuario.activo) return null;

  // Se devuelven los datos frescos de la base, no los del token: si le
  // cambiaron el rol, aplica de inmediato.
  return {
    usuarioId: usuario.id,
    email: usuario.email,
    nombre: usuario.nombre,
    rol: usuario.rol === "ADMIN" ? "ADMIN" : "EDITOR",
  };
});

/**
 * Exige sesión iniciada.
 *
 * Redirige a `/logout` y no directo a `/login` porque acá se llega también con
 * una cookie firmada válida cuyo usuario ya fue borrado o desactivado. En ese
 * caso hay que eliminar la cookie: si no, `proxy.ts` la ve válida, rebota de
 * vuelta al panel y se arma un bucle de redirecciones. Ver src/app/logout/route.ts
 */
export async function requireUsuario(): Promise<Sesion> {
  const sesion = await sesionActual();
  if (!sesion) redirect("/logout");
  return sesion;
}

/**
 * Exige rol ADMIN en una PÁGINA.
 *
 * Devuelve al panel con un aviso en vez de lanzar: un EDITOR que entra por
 * URL directa se merece una explicación, no una pantalla de error del
 * servidor. Para server actions se usa `requireAdminEnAccion()`, que sí lanza
 * porque ahí el error se convierte en un mensaje dentro del formulario.
 */
export async function requireAdmin(): Promise<Sesion> {
  const sesion = await requireUsuario();
  if (sesion.rol !== "ADMIN") redirect("/admin?sinPermiso=1");
  return sesion;
}

/**
 * Variante para server actions: en vez de redirigir, devuelve un error que la
 * acción convierte en mensaje en pantalla.
 */
export async function requireUsuarioEnAccion(): Promise<Sesion> {
  const sesion = await sesionActual();
  if (!sesion) {
    throw new NoAutorizadoError("Tu sesión venció. Volvé a iniciar sesión.");
  }
  return sesion;
}

export async function requireAdminEnAccion(): Promise<Sesion> {
  const sesion = await requireUsuarioEnAccion();
  if (sesion.rol !== "ADMIN") {
    throw new NoAutorizadoError("Solo un administrador puede hacer esto.");
  }
  return sesion;
}
