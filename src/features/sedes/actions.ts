"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  ejecutarAccion,
  exito,
  fallo,
  falloDeValidacion,
  type EstadoAccion,
} from "@/lib/acciones";
import { db } from "@/lib/db";
import { requireUsuarioEnAccion } from "@/lib/guards";
import { slugUnico } from "@/lib/texto";

/**
 * CRUD de sedes.
 *
 * Las direcciones van en formato tico ("costado noroeste del Estadio
 * Municipal"), que es como la gente realmente ubica un local acá.
 */

const esquema = z.object({
  nombre: z.string().trim().min(2, "Escribí el nombre de la sede.").max(60),
  direccion: z
    .string()
    .trim()
    .min(5, "Escribí la dirección como se la darías a un cliente.")
    .max(200),
  telefono: z
    .string()
    .trim()
    .max(30)
    .transform((v) => (v === "" ? null : v)),
  orden: z.coerce.number().int().min(0).max(999),
  activa: z.boolean(),
  proximamente: z.boolean(),
});

function refrescar() {
  revalidatePath("/");
  revalidatePath("/sedes");
  revalidatePath("/admin/sedes");
  revalidatePath("/admin/inventario");
}

export async function guardarSede(
  _previo: EstadoAccion,
  formData: FormData
): Promise<EstadoAccion> {
  // Para repoblar el formulario si el guardado falla (React 19 resetea el form).
  const enviados = {
    nombre: String(formData.get("nombre") ?? ""),
    direccion: String(formData.get("direccion") ?? ""),
    telefono: String(formData.get("telefono") ?? ""),
    orden: String(formData.get("orden") ?? ""),
    activa: formData.get("activa") !== null,
    proximamente: formData.get("proximamente") !== null,
  };

  const resultado = await ejecutarAccion(async () => {
    await requireUsuarioEnAccion();

    const id = String(formData.get("id") ?? "");
    const parseo = esquema.safeParse({
      nombre: formData.get("nombre") ?? "",
      direccion: formData.get("direccion") ?? "",
      telefono: formData.get("telefono") ?? "",
      orden: formData.get("orden") || 0,
      activa: formData.get("activa") !== null,
      proximamente: formData.get("proximamente") !== null,
    });
    if (!parseo.success) return falloDeValidacion(parseo.error);
    const datos = parseo.data;

    if (id) {
      await db.sede.update({ where: { id }, data: datos });
      refrescar();
      return exito("Sede actualizada.");
    }

    const slug = await slugUnico(datos.nombre, async (candidato) =>
      Boolean(
        await db.sede.findUnique({
          where: { slug: candidato },
          select: { id: true },
        })
      )
    );

    await db.sede.create({ data: { ...datos, slug } });
    refrescar();
    return exito("Sede creada.");
  });

  return resultado.ok
    ? resultado
    : { ...resultado, valores: enviados, nonce: crypto.randomUUID() };
}

export async function eliminarSede(
  _previo: EstadoAccion,
  formData: FormData
): Promise<EstadoAccion> {
  return ejecutarAccion(async () => {
    await requireUsuarioEnAccion();

    const id = String(formData.get("id") ?? "");

    const conStock = await db.existencia.count({
      where: { sedeId: id, cantidad: { gt: 0 } },
    });
    if (conStock > 0) {
      return fallo(
        `Esa sede todavía tiene existencias cargadas en ${conStock} ${
          conStock === 1 ? "producto" : "productos"
        }. Desactivala en vez de borrarla, así no se pierde el historial.`
      );
    }

    await db.sede.delete({ where: { id } });
    refrescar();
    return exito("Sede eliminada.");
  });
}
