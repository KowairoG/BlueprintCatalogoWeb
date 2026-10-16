import type { EstadoStock } from "@/lib/constantes";
import { InventarioNoConfiguradoError } from "@/lib/errores";

export { InventarioNoConfiguradoError };

/**
 * Contrato del origen de existencias.
 *
 * Toda la aplicación lee el stock a través de esta interfaz. Nunca consulta la
 * tabla `existencias` directamente. Ese es el espacio reservado para que, en
 * una versión futura, el stock lo mande el sistema de facturación o punto de
 * venta del local sin reescribir el sitio: basta con implementar esta misma
 * interfaz en `apiExterna.ts` y cambiar una variable de entorno.
 *
 * Ver docs/integraciones.md
 */

export type ExistenciaSede = {
  sedeId: string;
  sedeNombre: string;
  sedeSlug: string;
  cantidad: number;
  umbralBajo: number;
  /** Derivado de cantidad + umbralBajo. Ver src/lib/stock.ts */
  estado: EstadoStock;
  /** "local" o el nombre del sistema que sincronizó el dato. */
  origen: string;
  actualizadoEn: Date | null;
};

/** Una cantidad a fijar. El sedeId va aparte porque el lote es de una sola sede. */
export type CambioDeExistencia = {
  productoId: string;
  cantidad: number;
};

export interface InventarioProvider {
  /** Nombre legible del origen, para mostrarlo en el panel. */
  readonly nombre: string;

  /**
   * Si es true, el panel deshabilita la edición de cantidades porque el stock
   * lo manda un sistema externo y editarlo acá se perdería en la próxima
   * sincronización.
   */
  readonly soloLectura: boolean;

  /** Existencias de un producto en todas las sedes activas. */
  porProducto(productoId: string): Promise<ExistenciaSede[]>;

  /**
   * Existencias de varios productos de una sola vez.
   * Existe para que el grid del catálogo no dispare una consulta por tarjeta.
   */
  porProductos(productoIds: string[]): Promise<Map<string, ExistenciaSede[]>>;

  /** Existencias de todos los productos en una sede. */
  porSede(sedeId: string): Promise<Map<string, ExistenciaSede>>;

  /** Fija la cantidad de un producto en una sede. */
  ajustar(productoId: string, sedeId: string, cantidad: number): Promise<void>;

  /**
   * Fija varias cantidades de una misma sede en una sola operación atómica.
   *
   * Existe porque el guardado real del panel es una tabla entera, no un
   * producto suelto: si a la mitad falla algo, no puede quedar media sede
   * actualizada sin que nadie se entere. O entran todos los cambios o no entra
   * ninguno.
   *
   * También es cuestión de velocidad: cuarenta escrituras sueltas son cuarenta
   * confirmaciones a disco; dentro de una transacción es una sola.
   */
  ajustarLote(sedeId: string, cambios: CambioDeExistencia[]): Promise<void>;
}
