/**
 * Formato de dinero.
 *
 * Los montos se guardan como ENTEROS de la unidad menor que el negocio usa a
 * diario. Para colones eso son colones enteros: ₡32.500 se guarda como 32500.
 * Nunca floats: el dinero en punto flotante acumula errores de redondeo.
 *
 * ── Para clonar el proyecto a un negocio con otra moneda ──────────────────
 * Se cambia solo el objeto MONEDA de abajo. Nada más en el código conoce el
 * símbolo ni el separador.
 *
 * Si la moneda usa decimales (dólares, euros), poné `decimales: 2` y seguí
 * guardando enteros —centavos— en la base: 1250 se muestra como $12.50. Eso
 * mantiene la regla de no usar floats.
 *
 * El idioma y el formato de fecha van aparte, en `src/lib/region.ts`.
 */

export const MONEDA = {
  /** Código ISO. Se publica en la API. */
  codigo: "CRC",
  simbolo: "₡",
  /** "antes" → ₡32.500 · "despues" → 32.500 ₡ */
  posicionSimbolo: "antes" as "antes" | "despues",
  /** En Costa Rica los miles van con punto y los decimales con coma. */
  separadorMiles: ".",
  separadorDecimal: ",",
  /** Los colones no se manejan con céntimos en el día a día. */
  decimales: 0,
} as const;

function agruparMiles(entero: string): string {
  return entero.replace(/\B(?=(\d{3})+(?!\d))/g, MONEDA.separadorMiles);
}

/**
 * 32500 -> "₡32.500"
 *
 * El separador se pone a mano en vez de con `Intl.NumberFormat`: según la
 * versión de ICU, `toLocaleString("es-CR")` devuelve un espacio fino en lugar
 * del punto, y el resultado salía distinto en el servidor y en el navegador.
 */
export function formatearMonto(monto: number): string {
  const factor = 10 ** MONEDA.decimales;
  const redondeado = Math.round(Math.abs(monto));

  const entero = agruparMiles(String(Math.trunc(redondeado / factor)));

  const cuerpo =
    MONEDA.decimales > 0
      ? entero +
        MONEDA.separadorDecimal +
        String(redondeado % factor).padStart(MONEDA.decimales, "0")
      : entero;

  const signo = monto < 0 ? "-" : "";

  return MONEDA.posicionSimbolo === "antes"
    ? `${signo}${MONEDA.simbolo}${cuerpo}`
    : `${signo}${cuerpo} ${MONEDA.simbolo}`;
}

/**
 * Alias corto para las plantillas: `{monto(precio)}` se lee mejor que
 * `{formatearMonto(precio)}` en medio del JSX.
 *
 * Tiene el nombre de la magnitud y no el de la moneda a propósito: si se
 * llamara `colones`, cambiar MONEDA obligaría a renombrarlo en todo el código.
 */
export const monto = formatearMonto;

/**
 * Convierte lo que el admin escribe en el formulario a un entero.
 * Acepta "32500", "32.500", "₡32,500" y "32 500".
 * Devuelve null si no hay un número válido.
 */
export function aMonto(entrada: string | number | null | undefined): number | null {
  if (entrada === null || entrada === undefined || entrada === "") return null;
  if (typeof entrada === "number") {
    return Number.isFinite(entrada) ? Math.round(entrada) : null;
  }

  const limpio = entrada.replace(/[^\d]/g, "");
  if (limpio === "") return null;

  const valor = Number(limpio);
  return Number.isFinite(valor) ? valor : null;
}

/** Porcentaje de descuento entre el precio anterior y el actual. */
export function porcentajeDescuento(
  precio: number,
  precioAnterior: number | null | undefined
): number | null {
  if (!precioAnterior || precioAnterior <= precio) return null;
  return Math.round(((precioAnterior - precio) / precioAnterior) * 100);
}
