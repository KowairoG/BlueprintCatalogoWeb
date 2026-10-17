import { PrismaClient } from "@/generated/prisma/client";
import { PrismaClient as PrismaClientWorkerd } from "@/generated/prisma-workerd/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaD1 } from "@prisma/adapter-d1";
import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * Cliente de Prisma, con proveedor intercambiable por entorno.
 *
 *   DB_PROVIDER = "sqlite-local" (por defecto) → archivo SQLite vía better-sqlite3.
 *                 "d1"                          → Cloudflare D1 por binding.
 *
 * Es el mismo patrón "enchufe" del inventario (`INVENTARIO_PROVIDER`): el
 * esquema de Prisma no cambia (sigue siendo SQLite por dentro), solo cambia cómo
 * se conecta. Ver docs/plan-migracion-cloudflare.md (Fase 2).
 *
 * El cliente se crea **perezosamente**, en el primer acceso a `db`, no al
 * importar el módulo. En Workers el binding `env.DB` solo existe dentro de un
 * request (vía `getCloudflareContext()`), así que no se puede resolver en el
 * tope del módulo; el Proxy de abajo difiere la creación hasta el primer uso,
 * que ya ocurre dentro del request.
 */

const PROVEEDOR = (process.env.DB_PROVIDER ?? "sqlite-local").toLowerCase();

const globalParaPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

/** Memo por isolate/proceso: evita recrear el cliente en cada acceso. */
let instancia: PrismaClient | undefined = globalParaPrisma.prisma;

/**
 * Pone la base en modo WAL antes de que Prisma la abra (solo sqlite-local).
 *
 * En el modo por defecto (`delete`) una escritura bloquea la base entera;
 * en WAL los lectores y el escritor no se estorban. `journal_mode` queda grabada
 * en la cabecera del archivo, así que basta ponerla una vez; es idempotente.
 */
async function activarWal(url: string): Promise<void> {
  const ruta = url.startsWith("file:") ? url.slice("file:".length) : url;
  // Las bases remotas (D1/libSQL) no son archivos y manejan su propio journal.
  if (ruta.includes("://")) return;

  try {
    const { default: Database } = await import("better-sqlite3");
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
    // Que WAL no se active no justifica tumbar la app: sin él funciona igual,
    // solo con más contención. Pero tiene que quedar dicho en el log.
    console.warn("[db] No se pudo activar WAL:", error);
  }
}

function crearClienteD1(): PrismaClient {
  const { env } = getCloudflareContext();
  const d1 = (env as unknown as { DB?: unknown }).DB;
  if (!d1) {
    throw new Error(
      "DB_PROVIDER=d1 pero no existe el binding env.DB. Revisá wrangler.jsonc."
    );
  }
  // Cliente generado con runtime "workerd" (WASM precompilado, no en runtime).
  return new PrismaClientWorkerd({
    adapter: new PrismaD1(d1 as never),
  }) as unknown as PrismaClient;
}

function crearClienteSqliteLocal(): PrismaClient {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "Falta DATABASE_URL. Copiá .env.example como .env y volvé a arrancar."
    );
  }
  // WAL es best-effort y asíncrono; no bloquea la creación del cliente. La
  // pragma queda grabada en el archivo para las conexiones siguientes.
  void activarWal(url);
  return new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) });
}

function obtenerCliente(): PrismaClient {
  if (instancia) return instancia;

  instancia = PROVEEDOR === "d1" ? crearClienteD1() : crearClienteSqliteLocal();

  // En desarrollo Next recarga módulos; sin este singleton se abrirían
  // conexiones nuevas en cada recarga hasta agotar el pool.
  if (process.env.NODE_ENV !== "production") {
    globalParaPrisma.prisma = instancia;
  }
  return instancia;
}

/**
 * `db` se comporta como un `PrismaClient` normal (`db.producto.findMany()`,
 * `db.$transaction(...)`), pero resuelve el cliente real de forma perezosa en el
 * primer acceso. Así los 21+ sitios que importan `db` no cambian.
 */
export const db = new Proxy({} as PrismaClient, {
  get(_destino, prop) {
    const real = obtenerCliente() as unknown as Record<string | symbol, unknown>;
    const valor = real[prop];
    return typeof valor === "function" ? (valor as (...a: unknown[]) => unknown).bind(real) : valor;
  },
});
