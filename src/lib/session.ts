import { SignJWT, jwtVerify } from "jose";
import type { Rol } from "@/lib/constantes";
import { esRol } from "@/lib/constantes";
import { verificarSecretoDeSesion } from "@/lib/entorno";

/**
 * Sesión del panel: un JWT firmado que viaja en una cookie httpOnly.
 *
 * Este archivo no importa la base de datos ni bcrypt a propósito: lo usa
 * también `proxy.ts`, que corre antes de la aplicación y debe ser liviano.
 */

export const COOKIE_SESION = "tienda_sesion";

/** Una semana. Es un backoffice de tienda, no un banco. */
const DURACION_SEGUNDOS = 60 * 60 * 24 * 7;

export type Sesion = {
  usuarioId: string;
  email: string;
  nombre: string;
  rol: Rol;
};

let claveCache: Uint8Array | null = null;

function clave(): Uint8Array {
  if (claveCache) return claveCache;

  // La validación vive en lib/entorno.ts porque no alcanza con medir el largo:
  // el secreto de ejemplo es largo y además es público.
  claveCache = new TextEncoder().encode(verificarSecretoDeSesion());
  return claveCache;
}

export async function firmarSesion(sesion: Sesion): Promise<string> {
  return new SignJWT({ ...sesion })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(sesion.usuarioId)
    .setIssuedAt()
    .setExpirationTime(`${DURACION_SEGUNDOS}s`)
    .sign(clave());
}

/** Devuelve la sesión si el token es válido y no venció; null en cualquier otro caso. */
export async function verificarSesion(token: string | undefined): Promise<Sesion | null> {
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, clave(), { algorithms: ["HS256"] });

    const { usuarioId, email, nombre, rol } = payload as Record<string, unknown>;
    if (
      typeof usuarioId !== "string" ||
      typeof email !== "string" ||
      typeof nombre !== "string" ||
      !esRol(rol)
    ) {
      return null;
    }

    return { usuarioId, email, nombre, rol };
  } catch {
    // Token vencido, firmado con otra clave o manipulado.
    return null;
  }
}

export const OPCIONES_COOKIE = {
  httpOnly: true,
  sameSite: "lax",
  path: "/",
  maxAge: DURACION_SEGUNDOS,
  secure: process.env.NODE_ENV === "production",
} as const;
