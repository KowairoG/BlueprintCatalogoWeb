import { proveedorApiExterna } from "@/lib/inventario/apiExterna";
import { proveedorPrisma } from "@/lib/inventario/prisma";
import type { InventarioProvider } from "@/lib/inventario/tipos";

export type {
  CambioDeExistencia,
  ExistenciaSede,
  InventarioProvider,
} from "@/lib/inventario/tipos";
export { InventarioNoConfiguradoError } from "@/lib/inventario/tipos";

/**
 * Selector del origen de existencias.
 *
 * Este es el único lugar de la aplicación que sabe de dónde sale el stock.
 * Todo lo demás importa `inventario` y no se entera.
 */

const PROVEEDORES = {
  prisma: proveedorPrisma,
  api: proveedorApiExterna,
} satisfies Record<string, InventarioProvider>;

type ClaveProveedor = keyof typeof PROVEEDORES;

function elegirProveedor(): InventarioProvider {
  const clave = (process.env.INVENTARIO_PROVIDER ?? "prisma").toLowerCase();

  if (clave in PROVEEDORES) {
    return PROVEEDORES[clave as ClaveProveedor];
  }

  throw new Error(
    `INVENTARIO_PROVIDER="${clave}" no existe. Valores válidos: ${Object.keys(
      PROVEEDORES
    ).join(", ")}.`
  );
}

export const inventario: InventarioProvider = elegirProveedor();
