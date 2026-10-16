import Database from "better-sqlite3";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * Cliente de Prisma compartido.
 *
 * En desarrollo Next.js recarga los módulos en cada cambio; sin este singleton
 * se abriría una conexión nueva por recarga hasta agotar el pool.
 */

const globalParaPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

/**
 * Pone la base en modo WAL antes de que Prisma la abra.
 *
 * En el modo por defecto (`delete`) una escritura bloquea la base entera:
 * mientras una sucursal guarda existencias, los clientes que navegan el
 * catálogo esperan. En WAL los lectores y el escritor no se estorban.
 *
 * `journal_mode` es la única pragma que queda grabada en la cabecera del
 * archivo, así que basta con ponerla una vez y todas las conexiones futuras la
 * heredan. Se ejecuta igual en cada arranque porque es idempotente y barata: de
 * esa forma el modo correcto no depende de que alguien haya corrido un script a
 * mano, ni se pierde si el .db viene de un respaldo hecho en modo `delete`.
 */
function activarWal(url: string): void {
  // Prisma recibe la ruta como "file:./prisma/tienda.db"; better-sqlite3
  // espera una ruta del sistema de archivos, sin el esquema.
  const ruta = url.startsWith("file:") ? url.slice("file:".length) : url;

  // Las bases remotas (libSQL/Turso, D1) no son archivos y manejan su propio
  // journal. Si algún día se migra, esto deja de aplicar solo.
  if (ruta.includes("://")) return;

  try {
    const bd = new Database(ruta);
    try {
      const modo = bd.pragma("journal_mode = WAL", { simple: true });
      if (modo !== "wal") {
        console.warn(
          `[db] No se pudo activar WAL (journal_mode quedó en "${String(modo)}").`
        );
      }
    } finally {
      bd.close();
    }
  } catch (error) {
    // Que WAL no se active no justifica tumbar la aplicación: sin él funciona
    // igual, solo con más contención. Pero tiene que quedar dicho en el log.
    console.warn("[db] No se pudo activar WAL:", error);
  }
}

function crearCliente() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "Falta DATABASE_URL. Copiá .env.example como .env y volvé a arrancar."
    );
  }

  activarWal(url);

  return new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url }),
  });
}

export const db = globalParaPrisma.prisma ?? crearCliente();

if (process.env.NODE_ENV !== "production") {
  globalParaPrisma.prisma = db;
}
