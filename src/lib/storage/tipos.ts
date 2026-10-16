import { ArchivoInvalidoError } from "@/lib/errores";

/**
 * Contrato de almacenamiento de imágenes.
 *
 * El resto de la aplicación sube archivos a través de esta interfaz y solo
 * recibe una URL. Migrar a Cloudflare R2, Supabase Storage o S3 es escribir
 * otra implementación, no tocar el formulario de productos.
 */

export { ArchivoInvalidoError };

export type ArchivoGuardado = {
  /** URL pública para usar en <img src>. */
  url: string;
  /** Identificador interno para poder borrarlo después. */
  clave: string;
};

export interface StorageProvider {
  readonly nombre: string;
  guardar(archivo: File): Promise<ArchivoGuardado>;
  borrar(clave: string): Promise<void>;
}

export const TAMANO_MAXIMO_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * Formatos aceptados, con la firma que llevan al principio del archivo.
 *
 * Esta tabla —y no el `type` que manda el navegador— es la que decide qué es
 * cada archivo. `File.type` lo pone el cliente y se puede falsificar: alguien
 * podría subir un `.html` diciendo que es `image/png`. Como los archivos se
 * sirven desde el mismo dominio, un HTML servido como imagen es una vía de XSS.
 *
 * Las firmas ("magic bytes") están en el contenido real y no se pueden mentir
 * sin dejar de ser una imagen válida.
 */
export const FORMATOS = {
  "image/jpeg": {
    extension: "jpg",
    // JPEG siempre empieza con FF D8 FF
    firma: (b: Uint8Array) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  "image/png": {
    extension: "png",
    // 89 50 4E 47 0D 0A 1A 0A
    firma: (b: Uint8Array) =>
      b[0] === 0x89 &&
      b[1] === 0x50 &&
      b[2] === 0x4e &&
      b[3] === 0x47 &&
      b[4] === 0x0d &&
      b[5] === 0x0a &&
      b[6] === 0x1a &&
      b[7] === 0x0a,
  },
  "image/webp": {
    extension: "webp",
    // "RIFF" .... "WEBP"
    firma: (b: Uint8Array) =>
      texto(b, 0, 4) === "RIFF" && texto(b, 8, 12) === "WEBP",
  },
  "image/avif": {
    extension: "avif",
    // Caja ftyp con marca "avif" o "avis"
    firma: (b: Uint8Array) =>
      texto(b, 4, 8) === "ftyp" && ["avif", "avis"].includes(texto(b, 8, 12)),
  },
} as const;

export type TipoImagen = keyof typeof FORMATOS;

export const TIPOS_PERMITIDOS = Object.keys(FORMATOS) as TipoImagen[];

/** Los primeros 12 bytes alcanzan para todas las firmas de arriba. */
const BYTES_A_LEER = 12;

function texto(bytes: Uint8Array, desde: number, hasta: number): string {
  return String.fromCharCode(...bytes.slice(desde, hasta));
}

/**
 * Valida tamaño y contenido, y devuelve el tipo REAL del archivo.
 *
 * Es async porque hay que leer los primeros bytes. Quien la llame debe usar el
 * tipo devuelto para armar la extensión: confiar en el nombre del archivo
 * original sería volver a confiar en el cliente.
 */
export async function validarImagen(archivo: File): Promise<TipoImagen> {
  if (archivo.size === 0) {
    throw new ArchivoInvalidoError("El archivo está vacío.");
  }

  if (archivo.size > TAMANO_MAXIMO_BYTES) {
    throw new ArchivoInvalidoError(
      `La imagen pesa ${(archivo.size / 1024 / 1024).toFixed(1)} MB. El máximo es 5 MB.`
    );
  }

  const cabecera = new Uint8Array(
    await archivo.slice(0, BYTES_A_LEER).arrayBuffer()
  );

  for (const [tipo, formato] of Object.entries(FORMATOS)) {
    if (formato.firma(cabecera)) return tipo as TipoImagen;
  }

  throw new ArchivoInvalidoError(
    "Ese archivo no es una imagen válida. Usá JPG, PNG, WebP o AVIF."
  );
}

export function extensionDe(tipo: TipoImagen): string {
  return FORMATOS[tipo].extension;
}
