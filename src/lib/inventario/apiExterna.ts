import {
  InventarioNoConfiguradoError,
  type CambioDeExistencia,
  type ExistenciaSede,
  type InventarioProvider,
} from "@/lib/inventario/tipos";

/**
 * ══════════════════════════════════════════════════════════════════════════
 *  ESPACIO RESERVADO — API EXTERNA DE EXISTENCIAS  (versión futura)
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Este archivo es el enchufe para cuando el stock deje de digitarse a mano y
 * lo mande el sistema de facturación o punto de venta del local.
 *
 * TODAVÍA NO ESTÁ IMPLEMENTADO. Está acá a propósito: el resto de la
 * aplicación ya lee las existencias a través de `InventarioProvider`, así que
 * conectar el sistema externo es escribir los cinco métodos de abajo — no
 * tocar pantallas, consultas ni componentes.
 *
 * ── Cómo activarlo ────────────────────────────────────────────────────────
 *   1. Implementar los métodos marcados con TODO.
 *   2. En .env:
 *        INVENTARIO_PROVIDER="api"
 *        INVENTARIO_API_URL="https://sistema-del-local/api"
 *        INVENTARIO_API_TOKEN="..."
 *   3. Poner `soloLectura: true` si el sistema externo es el que manda; el
 *      panel deshabilita solo la edición de cantidades.
 *
 * ── Qué tiene que devolver ────────────────────────────────────────────────
 *   El sistema externo casi seguro identifica los productos con SU código, no
 *   con el id de esta base. Para eso existe `Producto.codigoExterno`: la
 *   traducción entre ambos mundos va acá adentro, no se filtra al resto de la
 *   aplicación.
 *
 *   `estado` no viene de la API: se calcula con `estadoDeStock()` de
 *   src/lib/stock.ts para que la regla de "últimas unidades" siga siendo una
 *   sola en todo el sistema.
 *
 * Guía completa en docs/integraciones.md
 */

function faltaConfiguracion(): never {
  throw new InventarioNoConfiguradoError(
    [
      "INVENTARIO_PROVIDER está en 'api', pero el proveedor de existencias por API todavía no está implementado.",
      "",
      "Opciones:",
      "  · Volvé a INVENTARIO_PROVIDER=\"prisma\" en el archivo .env para usar el stock de esta base de datos.",
      "  · O implementá src/lib/inventario/apiExterna.ts siguiendo docs/integraciones.md",
    ].join("\n")
  );
}

export const proveedorApiExterna: InventarioProvider = {
  nombre: "API externa",

  // Cuando el sistema externo sea la autoridad del stock, poner true: el panel
  // muestra las cantidades pero no deja editarlas.
  soloLectura: true,

  async porProducto(_productoId: string): Promise<ExistenciaSede[]> {
    // TODO: GET {INVENTARIO_API_URL}/existencias?codigo={producto.codigoExterno}
    //       y mapear la respuesta a ExistenciaSede[] usando estadoDeStock().
    return faltaConfiguracion();
  },

  async porProductos(
    _productoIds: string[]
  ): Promise<Map<string, ExistenciaSede[]>> {
    // TODO: una sola llamada en lote. Es el método más importante para el
    //       rendimiento del catálogo: no lo resuelvas llamando a porProducto()
    //       en un bucle.
    return faltaConfiguracion();
  },

  async porSede(_sedeId: string): Promise<Map<string, ExistenciaSede>> {
    // TODO: GET {INVENTARIO_API_URL}/sedes/{sede}/existencias
    return faltaConfiguracion();
  },

  async ajustar(
    _productoId: string,
    _sedeId: string,
    _cantidad: number
  ): Promise<void> {
    // Si soloLectura es true este método no debería llamarse nunca; el panel
    // deshabilita la edición. Si el sistema externo sí acepta escrituras,
    // poner soloLectura en false e implementar el POST/PUT correspondiente.
    return faltaConfiguracion();
  },

  async ajustarLote(
    _sedeId: string,
    _cambios: CambioDeExistencia[]
  ): Promise<void> {
    // TODO: un solo POST con todas las cantidades.
    //       Igual que porProductos, no lo resuelvas llamando a ajustar() en un
    //       bucle: además de lento, perdés la atomicidad que es justamente el
    //       punto de este método. Si el sistema externo no ofrece un endpoint
    //       en lote, documentalo acá y avisá al usuario en la pantalla.
    return faltaConfiguracion();
  },
};
