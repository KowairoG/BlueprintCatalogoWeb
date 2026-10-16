import { sinTildes } from "@/lib/texto";

/**
 * Arma el contenido de la columna `Producto.busqueda`.
 *
 * Junta todo lo que tiene sentido buscar en un solo texto normalizado, para
 * que la base pueda resolverlo con un LIKE simple. Es la única función que
 * define qué es "buscable": si mañana se quiere buscar por categoría, se
 * agrega acá y se recalcula.
 */

export type CamposBuscables = {
  nombre: string;
  descripcion: string;
  sku?: string | null;
  marcaNombre?: string | null;
  categoriaNombre?: string | null;
};

export function textoDeBusqueda(campos: CamposBuscables): string {
  return sinTildes(
    [
      campos.nombre,
      campos.marcaNombre,
      campos.categoriaNombre,
      campos.descripcion,
      campos.sku,
    ]
      .filter(Boolean)
      .join(" ")
  );
}

/**
 * Normaliza lo que escribe el visitante y lo parte en palabras.
 * Cada palabra tiene que aparecer: buscar "taladro bosch" pide las dos cosas.
 */
export function terminosDeBusqueda(consulta: string): string[] {
  return sinTildes(consulta).split(/\s+/).filter(Boolean).slice(0, 6);
}
