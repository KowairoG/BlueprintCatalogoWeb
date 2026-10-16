import bcrypt from "bcryptjs";

/**
 * Hash de contraseñas.
 *
 * Vive aparte de session.ts porque bcrypt es pesado y solo hace falta al
 * iniciar sesión o al crear un usuario — nunca en `proxy.ts`.
 */

const COSTO = 12;

export const LARGO_MINIMO_PASSWORD = 8;

export async function hashearPassword(password: string): Promise<string> {
  return bcrypt.hash(password, COSTO);
}

export async function verificarPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Hash descartable con el que comparar cuando el email no existe.
 *
 * Sin esto, un email inexistente respondería mucho más rápido que uno real y
 * cualquiera podría averiguar qué correos tienen cuenta midiendo el tiempo.
 */
export const HASH_SENUELO =
  "$2b$12$C6UzMDM.H6dfI/f/IKcEe.4TFDp0GBrhpBWVLNYnUwMcCE9WEjbdi";
