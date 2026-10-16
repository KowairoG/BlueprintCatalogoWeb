"use server";

import { revalidatePath } from "next/cache";
import {
  ejecutarAccion,
  exito,
  fallo,
  type EstadoAccion,
} from "@/lib/acciones";
import { requireUsuarioEnAccion } from "@/lib/guards";
import { inventario, type CambioDeExistencia } from "@/lib/inventario";

/**
 * Ajuste de existencias en lote.
 *
 * Es la tarea diaria real de la tienda: llegó mercadería o se vendió algo y
 * hay que actualizar una columna de números, no entrar producto por producto.
 */

export async function ajustarExistencias(
  _previo: EstadoAccion,
  formData: FormData
): Promise<EstadoAccion> {
  return ejecutarAccion(async () => {
    await requireUsuarioEnAccion();

    if (inventario.soloLectura) {
      return fallo(
        `Las existencias vienen de ${inventario.nombre} y no se editan desde acá.`
      );
    }

    const sedeId = String(formData.get("sedeId") ?? "");
    if (!sedeId) return fallo("Elegí una sede.");

    const anteriores = await inventario.porSede(sedeId);
    const cambios: CambioDeExistencia[] = [];

    for (const [clave, valor] of formData.entries()) {
      if (!clave.startsWith("cantidad_")) continue;

      const productoId = clave.slice("cantidad_".length);
      const cantidad = Math.max(
        0,
        Number(String(valor).replace(/[^\d]/g, "")) || 0
      );

      // Solo se manda lo que cambió: así una tabla de 200 filas no dispara
      // 200 escrituras cada vez que se toca un número.
      if (anteriores.get(productoId)?.cantidad === cantidad) continue;

      cambios.push({ productoId, cantidad });
    }

    if (cambios.length === 0) return exito("No había nada que cambiar.");

    // Una sola operación: o entran los N cambios o no entra ninguno.
    await inventario.ajustarLote(sedeId, cambios);

    // Las revalidaciones van después de que la transacción confirmó. Nunca
    // adentro: invalidarían el caché con datos que todavía pueden revertirse.
    revalidatePath("/");
    revalidatePath("/admin/inventario");
    revalidatePath("/admin/productos");

    const total = cambios.length;
    return exito(
      `${total} ${total === 1 ? "cantidad actualizada" : "cantidades actualizadas"}.`
    );
  });
}
