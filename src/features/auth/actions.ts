"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  ejecutarAccion,
  fallo,
  falloDeValidacion,
  type EstadoAccion,
} from "@/lib/acciones";
import { db } from "@/lib/db";
import {
  COOKIE_SESION,
  OPCIONES_COOKIE,
  firmarSesion,
} from "@/lib/session";
import {
  LIMITE_LOGIN_CUENTA,
  LIMITE_LOGIN_IP,
  estadoDeLimite,
  limpiarLimite,
  registrarFallo,
  textoDeEspera,
} from "@/lib/rateLimit";
import { HASH_SENUELO, verificarPassword } from "@/features/auth/password";
import { esquemaLogin } from "@/features/auth/schemas";

/** Solo se acepta un destino interno: un "destino" externo sería redirección abierta. */
function destinoSeguro(valor: FormDataEntryValue | null): string {
  const destino = typeof valor === "string" ? valor : "";
  return destino.startsWith("/") && !destino.startsWith("//") ? destino : "/admin";
}

/**
 * IP del visitante para contar intentos.
 *
 * `x-forwarded-for` lo pone el proxy de adelante (Caddy, Nginx, Vercel) y se
 * toma la primera entrada, que es el cliente original. Si no hay proxy, no hay
 * cabecera: se usa una clave común, con lo cual el límite por IP pasa a ser un
 * límite global. Es más restrictivo, no menos, así que falla del lado seguro.
 */
async function ipDelVisitante(): Promise<string> {
  const cabeceras = await headers();
  const reenviada = cabeceras.get("x-forwarded-for");
  if (reenviada) return reenviada.split(",")[0]!.trim();
  return cabeceras.get("x-real-ip") ?? "sin-ip";
}

export async function iniciarSesion(
  _estadoPrevio: EstadoAccion,
  formData: FormData
): Promise<EstadoAccion> {
  const destino = destinoSeguro(formData.get("destino"));

  return ejecutarAccion(async () => {
    const parseo = esquemaLogin.safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
    });
    if (!parseo.success) return falloDeValidacion(parseo.error);

    const { email, password } = parseo.data;
    const correo = email.toLowerCase();

    const ip = await ipDelVisitante();
    const claveIp = `login:ip:${ip}`;
    const claveCuenta = `login:cuenta:${correo}`;

    // Se revisa ANTES de tocar la base y antes de correr bcrypt: un login
    // bloqueado no debe costar trabajo al servidor.
    for (const [clave, regla] of [
      [claveIp, LIMITE_LOGIN_IP],
      [claveCuenta, LIMITE_LOGIN_CUENTA],
    ] as const) {
      const estado = estadoDeLimite(clave, regla);
      if (estado.bloqueado) {
        return fallo(
          `Demasiados intentos fallidos. Probá de nuevo en ${textoDeEspera(estado.esperaSegundos)}.`
        );
      }
    }

    const usuario = await db.usuario.findUnique({ where: { email: correo } });

    // Se compara siempre contra un hash —real o señuelo— para que un correo
    // inexistente tarde lo mismo que uno real.
    const coincide = await verificarPassword(
      password,
      usuario?.passwordHash ?? HASH_SENUELO
    );

    if (!usuario || !coincide) {
      registrarFallo(claveIp, LIMITE_LOGIN_IP);
      const estado = registrarFallo(claveCuenta, LIMITE_LOGIN_CUENTA);

      if (estado.bloqueado) {
        return fallo(
          `Demasiados intentos fallidos. Probá de nuevo en ${textoDeEspera(estado.esperaSegundos)}.`
        );
      }

      // Mensaje genérico a propósito: no se revela si el correo existe.
      // Sí se avisa cuántos intentos quedan, porque eso le sirve a quien
      // simplemente olvidó su contraseña y no le da nada útil a un atacante:
      // ya sabe que hay un límite.
      return fallo(
        estado.restantes <= 2
          ? `Correo o contraseña incorrectos. Te quedan ${estado.restantes} ${estado.restantes === 1 ? "intento" : "intentos"}.`
          : "Correo o contraseña incorrectos."
      );
    }

    if (!usuario.activo) {
      return fallo("Esta cuenta está desactivada. Hablá con un administrador.");
    }

    // Entró bien: se borra el contador para que un olvido de contraseña no le
    // deje penalización arrastrada.
    limpiarLimite(claveCuenta);
    limpiarLimite(claveIp);

    const token = await firmarSesion({
      usuarioId: usuario.id,
      email: usuario.email,
      nombre: usuario.nombre,
      rol: usuario.rol === "ADMIN" ? "ADMIN" : "EDITOR",
    });

    (await cookies()).set(COOKIE_SESION, token, OPCIONES_COOKIE);

    redirect(destino);
  });
}

export async function cerrarSesion(): Promise<void> {
  (await cookies()).delete(COOKIE_SESION);
  redirect("/login");
}
