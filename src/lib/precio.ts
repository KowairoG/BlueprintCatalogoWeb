/**
 * Única fuente de verdad de si un precio se publica o no.
 *
 * Ninguna pantalla ni endpoint debe leer `producto.precio` directamente:
 * todo pasa por acá. Así apagar los precios es un solo switch y no quedan
 * fugas en alguna tarjeta o en el JSON de la API.
 *
 * Jerarquía de decisión:
 *   producto.mostrarPrecio === true   -> se muestra siempre
 *   producto.mostrarPrecio === false  -> se oculta siempre
 *   producto.mostrarPrecio === null   -> hereda la política global
 */

export const TEXTO_PRECIO_OCULTO = "Consultar precio";

export type EntradaPrecio = {
  precio: number;
  precioAnterior?: number | null;
  mostrarPrecio?: boolean | null;
};

export type PrecioResuelto =
  | { visible: true; precio: number; precioAnterior: number | null }
  | { visible: false; precio: null; precioAnterior: null };

export function resolverPrecio(
  producto: EntradaPrecio,
  mostrarPorDefecto: boolean
): PrecioResuelto {
  const visible = producto.mostrarPrecio ?? mostrarPorDefecto;

  if (!visible) {
    return { visible: false, precio: null, precioAnterior: null };
  }

  const anterior = producto.precioAnterior ?? null;
  return {
    visible: true,
    precio: producto.precio,
    // Un "precio anterior" menor o igual al actual no es una oferta: se ignora
    // en vez de mostrar un tachado sin sentido.
    precioAnterior: anterior !== null && anterior > producto.precio ? anterior : null,
  };
}

/**
 * ¿Tiene sentido ofrecer filtros y ordenamiento por precio?
 * Solo si la tienda publica precios por defecto; si están ocultos, ordenar por
 * un número que el visitante no ve es confuso.
 */
export function permiteOrdenarPorPrecio(mostrarPorDefecto: boolean): boolean {
  return mostrarPorDefecto;
}
