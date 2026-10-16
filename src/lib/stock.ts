import { type EstadoStock, TEXTO_ESTADO_STOCK } from "@/lib/constantes";

/**
 * Única fuente de verdad del estado de existencias.
 *
 * El estado NO se guarda en la base de datos: se deriva siempre de la cantidad.
 * Si se guardara, existirían dos verdades que tarde o temprano se
 * desincronizan (cantidad = 0 con estado "en stock").
 */

export const UMBRAL_BAJO_POR_DEFECTO = 2;

export function estadoDeStock(
  cantidad: number,
  umbralBajo: number = UMBRAL_BAJO_POR_DEFECTO
): EstadoStock {
  if (cantidad <= 0) return "agotado";
  if (cantidad <= umbralBajo) return "poco";
  return "hay";
}

export function textoDeStock(
  cantidad: number,
  umbralBajo?: number
): string {
  return TEXTO_ESTADO_STOCK[estadoDeStock(cantidad, umbralBajo)];
}

/** Clases de color para el punto y el texto del estado. */
export const CLASE_ESTADO: Record<EstadoStock, string> = {
  hay: "text-verde",
  poco: "text-amarillo",
  agotado: "text-rojo",
};

export const CLASE_PUNTO: Record<EstadoStock, string> = {
  hay: "bg-verde",
  poco: "bg-amarillo",
  agotado: "bg-rojo",
};

/** ¿Hay al menos una sede con unidades disponibles? */
export function hayEnAlgunaSede(
  existencias: readonly { cantidad: number }[]
): boolean {
  return existencias.some((e) => e.cantidad > 0);
}

/** Total de unidades sumando todas las sedes. */
export function totalUnidades(
  existencias: readonly { cantidad: number }[]
): number {
  return existencias.reduce((suma, e) => suma + e.cantidad, 0);
}
