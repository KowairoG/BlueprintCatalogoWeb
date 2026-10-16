import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  extensionDe,
  validarImagen,
  type ArchivoGuardado,
  type StorageProvider,
} from "@/lib/storage/tipos";

/**
 * Guarda las imágenes en public/uploads del propio servidor.
 *
 * Sirve para desarrollo y para un VPS. NO sirve en Vercel ni en ningún hosting
 * con disco efímero: ahí las imágenes desaparecen en cada despliegue. Para eso
 * está la interfaz StorageProvider — ver docs/integraciones.md
 *
 * Los archivos se agrupan por año/mes para que la carpeta no se vuelva
 * inmanejable con miles de fotos.
 */

const RAIZ_PUBLICA = path.join(process.cwd(), "public", "uploads");

export const almacenamientoLocal: StorageProvider = {
  nombre: "Disco local",

  async guardar(archivo: File): Promise<ArchivoGuardado> {
    // El tipo sale del contenido del archivo, no de lo que declaró el
    // navegador ni del nombre original.
    const tipo = await validarImagen(archivo);

    const ahora = new Date();
    const anio = String(ahora.getFullYear());
    const mes = String(ahora.getMonth() + 1).padStart(2, "0");

    // El nombre se genera entero: nada de lo que mandó el cliente llega al
    // sistema de archivos.
    const nombre = `${randomUUID()}.${extensionDe(tipo)}`;

    const carpeta = path.join(RAIZ_PUBLICA, anio, mes);
    await mkdir(carpeta, { recursive: true });

    const bytes = Buffer.from(await archivo.arrayBuffer());
    await writeFile(path.join(carpeta, nombre), bytes);

    const clave = `${anio}/${mes}/${nombre}`;
    return { url: `/uploads/${clave}`, clave };
  },

  async borrar(clave: string): Promise<void> {
    // Nunca se confía en la clave para armar una ruta: se normaliza y se
    // verifica que siga cayendo dentro de public/uploads. Sin esto, una clave
    // como "../../.env" borraría archivos fuera de la carpeta.
    const destino = path.resolve(RAIZ_PUBLICA, clave);
    if (!destino.startsWith(RAIZ_PUBLICA + path.sep)) return;

    // Que el archivo ya no exista no es un error: el objetivo es que no esté.
    await unlink(destino).catch(() => {});
  },
};
