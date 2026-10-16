import { almacenamientoLocal } from "@/lib/storage/localDisk";
import type { StorageProvider } from "@/lib/storage/tipos";

export type { ArchivoGuardado, StorageProvider } from "@/lib/storage/tipos";
export {
  ArchivoInvalidoError,
  TAMANO_MAXIMO_BYTES,
  TIPOS_PERMITIDOS,
} from "@/lib/storage/tipos";

/**
 * Selector del almacenamiento de imágenes. Único lugar que sabe dónde se
 * guardan los archivos.
 *
 * Para agregar Cloudflare R2 o Supabase Storage: implementar StorageProvider en
 * un archivo nuevo, registrarlo acá y cambiar STORAGE_PROVIDER en .env.
 */

const PROVEEDORES = {
  local: almacenamientoLocal,
} satisfies Record<string, StorageProvider>;

type ClaveProveedor = keyof typeof PROVEEDORES;

function elegirProveedor(): StorageProvider {
  const clave = (process.env.STORAGE_PROVIDER ?? "local").toLowerCase();

  if (clave in PROVEEDORES) {
    return PROVEEDORES[clave as ClaveProveedor];
  }

  throw new Error(
    `STORAGE_PROVIDER="${clave}" no existe. Valores válidos: ${Object.keys(
      PROVEEDORES
    ).join(", ")}.`
  );
}

export const almacenamiento: StorageProvider = elegirProveedor();

/** Convierte una URL guardada en la clave que entiende `borrar()`. */
export function claveDesdeUrl(url: string): string | null {
  const prefijo = "/uploads/";
  return url.startsWith(prefijo) ? url.slice(prefijo.length) : null;
}
