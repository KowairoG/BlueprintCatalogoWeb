import { randomUUID } from "node:crypto";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import {
  extensionDe,
  validarImagen,
  type ArchivoGuardado,
  type StorageProvider,
} from "@/lib/storage/tipos";

/**
 * Guarda las imágenes en un bucket de Cloudflare R2 (binding `FOTOS`).
 *
 * Es la contraparte "producción" de `localDisk.ts` (patrón enchufe, elegible por
 * `STORAGE_PROVIDER`; ver docs/plan-migracion-cloudflare.md, Fase 1). Mantiene la
 * MISMA forma de clave/URL que el disco local (`/uploads/<anio>/<mes>/<uuid>.ext`)
 * para que `ProductoImagen.url` y `claveDesdeUrl()` no cambien: las imágenes se
 * sirven desde R2 por la ruta `src/app/uploads/[...clave]/route.ts`, sin depender
 * de un dominio público del bucket (así cada clon funciona sin DNS extra).
 *
 * El binding solo existe dentro de un request (en Workers), por eso se resuelve
 * con `getCloudflareContext()` en cada operación, no al importar el módulo.
 */

type R2BucketLike = {
  put(
    key: string,
    value: ArrayBuffer,
    options?: { httpMetadata?: { contentType?: string } }
  ): Promise<unknown>;
  delete(key: string): Promise<void>;
};

function bucket(): R2BucketLike {
  const { env } = getCloudflareContext();
  const b = (env as unknown as { FOTOS?: R2BucketLike }).FOTOS;
  if (!b) {
    throw new Error(
      "STORAGE_PROVIDER=r2 pero no existe el binding env.FOTOS. Revisá wrangler.jsonc."
    );
  }
  return b;
}

export const almacenamientoR2: StorageProvider = {
  nombre: "Cloudflare R2",

  async guardar(archivo: File): Promise<ArchivoGuardado> {
    // El tipo sale del contenido real del archivo, no de lo que declaró el
    // navegador (igual que en el disco local).
    const tipo = await validarImagen(archivo);

    const ahora = new Date();
    const anio = String(ahora.getFullYear());
    const mes = String(ahora.getMonth() + 1).padStart(2, "0");
    const nombre = `${randomUUID()}.${extensionDe(tipo)}`;
    const clave = `${anio}/${mes}/${nombre}`;

    const bytes = await archivo.arrayBuffer();
    await bucket().put(clave, bytes, { httpMetadata: { contentType: tipo } });

    return { url: `/uploads/${clave}`, clave };
  },

  async borrar(clave: string): Promise<void> {
    // Que el objeto ya no exista no es un error: el objetivo es que no esté.
    await bucket().delete(clave);
  },
};
