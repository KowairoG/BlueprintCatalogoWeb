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
import { aSlug, slugUnico } from "@/lib/texto";

/** CRUD de categorías. El árbol madre → subcategoría alimenta el mega menú. */

const esquema = z.object({
  nombre: z.string().trim().min(2, "El nombre es muy corto.").max(60),
  icono: z
    .string()
    .trim()
    .max(8)
    .transform((v) => (v === "" ? null : v)),
  descripcion: z
    .string()
    .trim()
    .max(120)
    .transform((v) => (v === "" ? null : v)),
  padreId: z.string().transform((v) => (v === "" ? null : v)),
  orden: z.coerce.number().int().min(0).max(999),
});

function refrescar() {
  revalidatePath("/");
  revalidatePath("/admin/categorias");
}

export async function guardarCategoria(
  _previo: EstadoAccion,
  formData: FormData
): Promise<EstadoAccion> {
  // Para repoblar el formulario si el guardado falla (React 19 resetea el form).
  const enviados = {
    nombre: String(formData.get("nombre") ?? ""),
    icono: String(formData.get("icono") ?? ""),
    descripcion: String(formData.get("descripcion") ?? ""),
    padreId: String(formData.get("padreId") ?? ""),
    orden: String(formData.get("orden") ?? ""),
  };

  const resultado = await ejecutarAccion(async () => {
    await requireUsuarioEnAccion();

    const id = String(formData.get("id") ?? "");
    const parseo = esquema.safeParse({
      nombre: formData.get("nombre") ?? "",
      icono: formData.get("icono") ?? "",
      descripcion: formData.get("descripcion") ?? "",
      padreId: formData.get("padreId") ?? "",
      orden: formData.get("orden") || 0,
    });
    if (!parseo.success) return falloDeValidacion(parseo.error);
    const datos = parseo.data;

    if (id && datos.padreId === id) {
      return fallo("Una categoría no puede ser su propia madre.");
    }

    if (id) {
      // Mover una madre debajo de una de sus propias hijas dejaría el árbol en
      // un ciclo que ninguna consulta podría recorrer.
      if (datos.padreId) {
        const destino = await db.categoria.findUnique({
          where: { id: datos.padreId },
          select: { padreId: true },
        });
        if (destino?.padreId === id) {
          return fallo("No podés meter una categoría dentro de su propia hija.");
        }
      }

      await db.categoria.update({ where: { id }, data: datos });
      refrescar();
      return exito("Categoría actualizada.");
    }

    const slug = await slugUnico(
      datos.padreId ? `${datos.nombre}` : datos.nombre,
      async (candidato) =>
        Boolean(
          await db.categoria.findUnique({
            where: { slug: candidato },
            select: { id: true },
          })
        )
    );

    await db.categoria.create({ data: { ...datos, slug: slug || aSlug(datos.nombre) } });
    refrescar();
    return exito("Categoría creada.");
  });

  return resultado.ok
    ? resultado
    : { ...resultado, valores: enviados, nonce: crypto.randomUUID() };
}

export async function eliminarCategoria(formData: FormData): Promise<void> {
  await requireUsuarioEnAccion();

  const id = String(formData.get("id") ?? "");
  const categoria = await db.categoria.findUnique({
    where: { id },
    include: { _count: { select: { productos: true, hijas: true } } },
  });

  // Borrar una categoría con productos los dejaría sin categoría, que es un
  // campo obligatorio. La interfaz ya lo impide; esta es la red de seguridad.
  if (!categoria || categoria._count.productos > 0 || categoria._count.hijas > 0) {
    return;
  }

  await db.categoria.delete({ where: { id } });
  refrescar();
}
