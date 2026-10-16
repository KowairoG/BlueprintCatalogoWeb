"use server";

import { revalidatePath } from "next/cache";
import {
  ejecutarAccion,
  exito,
  fallo,
  falloDeValidacion,
  type EstadoAccion,
} from "@/lib/acciones";
import { db } from "@/lib/db";
import { requireAdminEnAccion } from "@/lib/guards";
import { hashearPassword } from "@/features/auth/password";
import {
  esquemaUsuarioEdicion,
  esquemaUsuarioNuevo,
} from "@/features/auth/schemas";

/**
 * Gestión de usuarios del panel. Solo para rol ADMIN.
 *
 * No hay registro público: las cuentas siempre las crea un administrador.
 */

function refrescar() {
  revalidatePath("/admin/usuarios");
}

function leer(formData: FormData) {
  return {
    nombre: String(formData.get("nombre") ?? ""),
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    rol: String(formData.get("rol") ?? "EDITOR"),
    activo: formData.get("activo") !== null,
  };
}

export async function crearUsuario(
  _previo: EstadoAccion,
  formData: FormData
): Promise<EstadoAccion> {
  return ejecutarAccion(async () => {
    await requireAdminEnAccion();

    const parseo = esquemaUsuarioNuevo.safeParse(leer(formData));
    if (!parseo.success) return falloDeValidacion(parseo.error);
    const datos = parseo.data;

    const repetido = await db.usuario.findUnique({
      where: { email: datos.email },
      select: { id: true },
    });
    if (repetido) {
      return fallo("Ya existe una cuenta con ese correo.", {
        email: ["Este correo ya está en uso."],
      });
    }

    await db.usuario.create({
      data: {
        nombre: datos.nombre,
        email: datos.email,
        rol: datos.rol,
        activo: datos.activo,
        passwordHash: await hashearPassword(datos.password),
      },
    });

    refrescar();
    return exito(`Cuenta creada para ${datos.email}.`);
  });
}

export async function actualizarUsuario(
  _previo: EstadoAccion,
  formData: FormData
): Promise<EstadoAccion> {
  return ejecutarAccion(async () => {
    const sesion = await requireAdminEnAccion();

    const id = String(formData.get("id") ?? "");
    if (!id) return fallo("Falta el identificador del usuario.");

    const parseo = esquemaUsuarioEdicion.safeParse(leer(formData));
    if (!parseo.success) return falloDeValidacion(parseo.error);
    const datos = parseo.data;

    // Un admin no puede quitarse a sí mismo el rol ni desactivarse: sin esto,
    // la tienda puede quedarse sin ningún administrador y sin forma de entrar.
    if (id === sesion.usuarioId && (datos.rol !== "ADMIN" || !datos.activo)) {
      return fallo(
        "No podés quitarte a vos mismo el acceso de administrador. Pedile a otro admin que lo haga."
      );
    }

    if (datos.rol !== "ADMIN" || !datos.activo) {
      const otrosAdmins = await db.usuario.count({
        where: { rol: "ADMIN", activo: true, id: { not: id } },
      });
      if (otrosAdmins === 0) {
        return fallo(
          "Este es el único administrador activo. Creá otro antes de cambiarle el rol."
        );
      }
    }

    const repetido = await db.usuario.findUnique({
      where: { email: datos.email },
      select: { id: true },
    });
    if (repetido && repetido.id !== id) {
      return fallo("Ya existe otra cuenta con ese correo.", {
        email: ["Este correo ya está en uso."],
      });
    }

    await db.usuario.update({
      where: { id },
      data: {
        nombre: datos.nombre,
        email: datos.email,
        rol: datos.rol,
        activo: datos.activo,
        // Password vacío significa "dejala como está".
        ...(datos.password
          ? { passwordHash: await hashearPassword(datos.password) }
          : {}),
      },
    });

    refrescar();
    return exito("Usuario actualizado.");
  });
}

export async function eliminarUsuario(
  _previo: EstadoAccion,
  formData: FormData
): Promise<EstadoAccion> {
  return ejecutarAccion(async () => {
    const sesion = await requireAdminEnAccion();

    const id = String(formData.get("id") ?? "");
    if (id === sesion.usuarioId) {
      return fallo("No podés borrar tu propia cuenta.");
    }

    const otrosAdmins = await db.usuario.count({
      where: { rol: "ADMIN", activo: true, id: { not: id } },
    });
    if (otrosAdmins === 0) {
      return fallo("No podés borrar al único administrador activo.");
    }

    await db.usuario.delete({ where: { id } });
    refrescar();
    return exito("Usuario eliminado.");
  });
}
