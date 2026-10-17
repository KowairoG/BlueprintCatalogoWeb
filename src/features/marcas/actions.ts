"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  ejecutarAccion,
  exito,
  falloDeValidacion,
  type EstadoAccion,
} from "@/lib/acciones";
import { db } from "@/lib/db";
import { requireUsuarioEnAccion } from "@/lib/guards";
import { slugUnico } from "@/lib/texto";

/** CRUD de marcas: las del rótulo del local más las que vayan agregando. */

const esquema = z.object({
  nombre: z.string().trim().min(1, "Escribí el nombre de la marca.").max(60),
  orden: z.coerce.number().int().min(0).max(999),
});

function refrescar() {
  revalidatePath("/");
  revalidatePath("/admin/marcas");
}

export async function guardarMarca(
  _previo: EstadoAccion,
  formData: FormData
): Promise<EstadoAccion> {
  // Para repoblar el formulario si el guardado falla (React 19 resetea el form).
  const enviados = {
    nombre: String(formData.get("nombre") ?? ""),
    orden: String(formData.get("orden") ?? ""),
  };

  const resultado = await ejecutarAccion(async () => {
    await requireUsuarioEnAccion();

    const id = String(formData.get("id") ?? "");
    const parseo = esquema.safeParse({
      nombre: formData.get("nombre") ?? "",
      orden: formData.get("orden") || 0,
    });
    if (!parseo.success) return falloDeValidacion(parseo.error);
    const datos = parseo.data;

    if (id) {
      await db.marca.update({ where: { id }, data: datos });
      refrescar();
      return exito("Marca actualizada.");
    }

    const slug = await slugUnico(datos.nombre, async (candidato) =>
      Boolean(
        await db.marca.findUnique({
          where: { slug: candidato },
          select: { id: true },
        })
      )
    );

    await db.marca.create({ data: { ...datos, slug } });
    refrescar();
    return exito("Marca creada.");
  });

  return resultado.ok
    ? resultado
    : { ...resultado, valores: enviados, nonce: crypto.randomUUID() };
}

export async function eliminarMarca(formData: FormData): Promise<void> {
  await requireUsuarioEnAccion();

  const id = String(formData.get("id") ?? "");

  // La marca es opcional en el producto, así que se puede borrar: los
  // productos quedan "sin marca" gracias a onDelete: SetNull.
  await db.marca.delete({ where: { id } }).catch(() => {});
  refrescar();
}
