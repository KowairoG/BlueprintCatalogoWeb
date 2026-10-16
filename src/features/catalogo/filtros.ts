import { esOrdenCatalogo, type OrdenCatalogo } from "@/lib/constantes";

/**
 * Lectura y armado de los filtros del catálogo.
 *
 * Todo vive en la URL (`?q=taladro&cat=herramientas&sede=central`) en vez de en estado
 * de React. Así una búsqueda se puede compartir por WhatsApp, el botón atrás
 * funciona, y Google puede indexar las categorías.
 */

export type FiltrosUrl = {
  q: string;
  cat: string;
  sede: string;
  marca: string;
  orden: OrdenCatalogo;
  etiqueta: string;
};

type Entrada = Record<string, string | string[] | undefined>;

function primero(valor: string | string[] | undefined): string {
  if (Array.isArray(valor)) return valor[0] ?? "";
  return valor ?? "";
}

export function leerFiltros(parametros: Entrada): FiltrosUrl {
  const orden = primero(parametros.orden);

  return {
    q: primero(parametros.q).slice(0, 80),
    cat: primero(parametros.cat),
    sede: primero(parametros.sede),
    marca: primero(parametros.marca),
    orden: esOrdenCatalogo(orden) ? orden : "relevancia",
    etiqueta: primero(parametros.etiqueta),
  };
}

/**
 * Arma un enlace conservando los filtros actuales y cambiando solo los que se
 * indiquen. Pasar "" en una clave la borra de la URL.
 */
export function enlaceConFiltros(
  actuales: FiltrosUrl,
  cambios: Partial<FiltrosUrl>
): string {
  const combinados: FiltrosUrl = { ...actuales, ...cambios };
  const parametros = new URLSearchParams();

  if (combinados.q) parametros.set("q", combinados.q);
  if (combinados.cat) parametros.set("cat", combinados.cat);
  if (combinados.sede) parametros.set("sede", combinados.sede);
  if (combinados.marca) parametros.set("marca", combinados.marca);
  if (combinados.etiqueta) parametros.set("etiqueta", combinados.etiqueta);
  if (combinados.orden !== "relevancia") parametros.set("orden", combinados.orden);

  const cadena = parametros.toString();
  return cadena ? `/?${cadena}` : "/";
}

export function hayFiltrosActivos(filtros: FiltrosUrl): boolean {
  return Boolean(
    filtros.q ||
      filtros.cat ||
      filtros.sede ||
      filtros.marca ||
      filtros.etiqueta ||
      filtros.orden !== "relevancia"
  );
}
