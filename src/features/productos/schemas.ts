import { z } from "zod";
import { ETIQUETAS_PRODUCTO } from "@/lib/constantes";

/**
 * Validación del formulario de productos.
 *
 * El mismo esquema se usa en la server action y para tipar el formulario, así
 * que no puede haber dos ideas distintas de qué es un producto válido.
 */

/**
 * Los campos de un <form> siempre llegan como string. Se limpia todo lo que no
 * sea dígito para aceptar "₡32.500", "32,500" o "32 500" igual que "32500".
 */
const soloDigitos = z
  .string()
  .trim()
  .transform((valor) => valor.replace(/[^\d]/g, ""));

const precio = soloDigitos
  .refine((valor) => valor !== "", "Escribí un precio.")
  .transform(Number)
  .pipe(
    z
      .number()
      .int()
      .min(1, "El precio tiene que ser mayor a cero.")
      .max(99_999_999, "Ese precio es demasiado alto.")
  );

const precioOpcional = soloDigitos.transform((valor) =>
  valor === "" ? null : Number(valor)
);

/**
 * Tres estados de visibilidad de precio:
 *   "" (heredar) | "si" | "no"
 */
export const VISIBILIDAD_PRECIO = ["", "si", "no"] as const;

const visibilidadPrecio = z
  .enum(VISIBILIDAD_PRECIO)
  .transform((valor) => (valor === "" ? null : valor === "si"));

export const esquemaProducto = z
  .object({
    nombre: z
      .string()
      .trim()
      .min(3, "El nombre es muy corto.")
      .max(120, "El nombre es muy largo; se ve mal en la tarjeta."),
    sku: z
      .string()
      .trim()
      .max(40, "El código es muy largo.")
      .transform((valor) => (valor === "" ? null : valor.toUpperCase())),
    descripcion: z
      .string()
      .trim()
      .min(10, "Escribí una descripción; es lo que convence al cliente.")
      .max(600, "La descripción es muy larga."),
    emoji: z
      .string()
      .trim()
      .max(8)
      .transform((valor) => (valor === "" ? null : valor)),
    categoriaId: z.string().min(1, "Elegí una categoría."),
    marcaId: z.string().transform((valor) => (valor === "" ? null : valor)),
    precio,
    precioAnterior: precioOpcional,
    mostrarPrecio: visibilidadPrecio,
    etiqueta: z
      .enum(["", ...ETIQUETAS_PRODUCTO])
      .transform((valor) => (valor === "" ? null : valor)),
    publicado: z.boolean(),
    destacado: z.boolean(),
    codigoExterno: z
      .string()
      .trim()
      .max(60)
      .transform((valor) => (valor === "" ? null : valor)),
  })
  .refine(
    (datos) =>
      datos.precioAnterior === null || datos.precioAnterior > datos.precio,
    {
      path: ["precioAnterior"],
      message:
        "El precio anterior tiene que ser mayor al actual, si no no es una oferta.",
    }
  );

export type DatosProducto = z.infer<typeof esquemaProducto>;

/** Lee un checkbox de FormData: presente = marcado. */
export function casilla(formData: FormData, nombre: string): boolean {
  return formData.get(nombre) !== null;
}

/** Arma el objeto que espera `esquemaProducto` a partir del FormData. */
export function leerFormularioProducto(formData: FormData) {
  return {
    nombre: String(formData.get("nombre") ?? ""),
    sku: String(formData.get("sku") ?? ""),
    descripcion: String(formData.get("descripcion") ?? ""),
    emoji: String(formData.get("emoji") ?? ""),
    categoriaId: String(formData.get("categoriaId") ?? ""),
    marcaId: String(formData.get("marcaId") ?? ""),
    precio: String(formData.get("precio") ?? ""),
    precioAnterior: String(formData.get("precioAnterior") ?? ""),
    mostrarPrecio: String(formData.get("mostrarPrecio") ?? ""),
    etiqueta: String(formData.get("etiqueta") ?? ""),
    publicado: casilla(formData, "publicado"),
    destacado: casilla(formData, "destacado"),
    codigoExterno: String(formData.get("codigoExterno") ?? ""),
  };
}

/**
 * Existencias que vienen en el mismo formulario, como `existencia_<sedeId>`.
 * Cargar un producto tiene que ser una sola pantalla y un solo guardado.
 */
export function leerExistencias(formData: FormData): Map<string, number> {
  const mapa = new Map<string, number>();

  for (const [clave, valor] of formData.entries()) {
    if (!clave.startsWith("existencia_")) continue;

    const sedeId = clave.slice("existencia_".length);
    const cantidad = Number(String(valor).replace(/[^\d]/g, ""));
    mapa.set(sedeId, Number.isFinite(cantidad) ? Math.max(0, cantidad) : 0);
  }

  return mapa;
}
