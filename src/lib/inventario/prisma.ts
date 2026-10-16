import { db } from "@/lib/db";
import { estadoDeStock } from "@/lib/stock";
import type {
  CambioDeExistencia,
  ExistenciaSede,
  InventarioProvider,
} from "@/lib/inventario/tipos";

/**
 * Proveedor por defecto: el stock vive en la misma base de datos y se digita
 * desde el panel.
 */

type FilaExistencia = {
  productoId: string;
  cantidad: number;
  umbralBajo: number;
  origen: string;
  actualizadoEn: Date;
  sede: { id: string; nombre: string; slug: string };
};

function aExistenciaSede(fila: FilaExistencia): ExistenciaSede {
  return {
    sedeId: fila.sede.id,
    sedeNombre: fila.sede.nombre,
    sedeSlug: fila.sede.slug,
    cantidad: fila.cantidad,
    umbralBajo: fila.umbralBajo,
    estado: estadoDeStock(fila.cantidad, fila.umbralBajo),
    origen: fila.origen,
    actualizadoEn: fila.actualizadoEn,
  };
}

const INCLUIR_SEDE = {
  sede: { select: { id: true, nombre: true, slug: true } },
} as const;

/** Solo sedes abiertas: las marcadas "próximamente" todavía no tienen stock. */
const SEDES_CON_STOCK = { activa: true, proximamente: false } as const;

const ORDEN_SEDE = { sede: { orden: "asc" } } as const;

/** Normaliza lo que llega del formulario: enteros, nunca negativos. */
function normalizar(cantidad: number): number {
  return Math.max(0, Math.trunc(cantidad));
}

/**
 * Se define como función suelta —y no como método del objeto— para que
 * `ajustar` pueda reutilizarla sin depender de `this`.
 */
async function ajustarLote(
  sedeId: string,
  cambios: CambioDeExistencia[]
): Promise<void> {
  if (cambios.length === 0) return;

  // La forma de arreglo de $transaction manda todas las consultas dentro de
  // una sola transacción: si una falla, se revierten todas.
  await db.$transaction(
    cambios.map(({ productoId, cantidad }) =>
      db.existencia.upsert({
        where: { productoId_sedeId: { productoId, sedeId } },
        update: { cantidad: normalizar(cantidad), origen: "local" },
        create: {
          productoId,
          sedeId,
          cantidad: normalizar(cantidad),
          origen: "local",
        },
      })
    )
  );
}

export const proveedorPrisma: InventarioProvider = {
  nombre: "Base de datos local",
  soloLectura: false,

  async porProducto(productoId) {
    const filas = await db.existencia.findMany({
      where: { productoId, sede: SEDES_CON_STOCK },
      include: INCLUIR_SEDE,
      orderBy: ORDEN_SEDE,
    });
    return filas.map(aExistenciaSede);
  },

  async porProductos(productoIds) {
    const mapa = new Map<string, ExistenciaSede[]>();
    if (productoIds.length === 0) return mapa;

    const filas = await db.existencia.findMany({
      where: { productoId: { in: productoIds }, sede: SEDES_CON_STOCK },
      include: INCLUIR_SEDE,
      orderBy: ORDEN_SEDE,
    });

    // Se siembra el mapa con todos los ids pedidos para que un producto sin
    // filas de existencia devuelva [] y no undefined.
    for (const id of productoIds) mapa.set(id, []);
    for (const fila of filas) {
      mapa.get(fila.productoId)?.push(aExistenciaSede(fila));
    }
    return mapa;
  },

  async porSede(sedeId) {
    const filas = await db.existencia.findMany({
      where: { sedeId },
      include: INCLUIR_SEDE,
    });

    const mapa = new Map<string, ExistenciaSede>();
    for (const fila of filas) {
      mapa.set(fila.productoId, aExistenciaSede(fila));
    }
    return mapa;
  },

  async ajustar(productoId, sedeId, cantidad) {
    // Un ajuste suelto es un lote de uno: una sola implementación que mantener.
    await ajustarLote(sedeId, [{ productoId, cantidad }]);
  },

  ajustarLote,
};
