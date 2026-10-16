# Concurrencia: WAL y guardado en lote

Dos cambios chicos en la capa de datos, pensados para hacerse **antes de
publicar el sitio**.

Hasta ahora SQLite venía funcionando como base de desarrollo, con un solo
usuario a la vez. Al desplegar en un VPS pasa a ser la base de producción real,
con dos sucursales cargando existencias y clientes navegando el catálogo al
mismo tiempo. Las dos tareas de acá abajo son lo que separa esos dos mundos.

Ninguna de las dos cambia el schema ni requiere migración de datos.

| # | Tarea | Archivos | Riesgo |
|---|---|---|---|
| 1 | Activar WAL | `src/lib/db.ts` | Bajo — reversible con una pragma |
| 2 | Guardado en lote atómico | 5 archivos de `inventario` | Bajo — sin cambio de schema |

Conviene hacerlas en orden y en commits separados: son independientes y así
cada una se puede revertir sola.

> El código de este documento se verificó con `tsc --noEmit` sobre una copia del
> proyecto: compila tal cual está escrito. La única dependencia nueva es
> `@types/better-sqlite3`, explicada en la Tarea 1.

---

## Tarea 1 · Activar WAL

### El problema

La base está en modo journal `delete`, que es el valor por defecto de SQLite:

```bash
sqlite3 prisma/tienda.db "pragma journal_mode;"
# delete
```

En ese modo, **una escritura bloquea la base entera, incluidas las lecturas**.
Traducido a esta tienda: mientras una sucursal guarda cuarenta cantidades desde
`/admin/inventario`, los clientes que están navegando el catálogo público
esperan a que termine. Con una sola persona usando el panel nunca se notó; con
el sitio publicado, sí.

En modo WAL (*write-ahead log*) los lectores y el escritor dejan de estorbarse:
las lecturas siguen viendo la última versión confirmada mientras la escritura
está en curso. Sigue habiendo un solo escritor a la vez — eso es propio de
SQLite y no cambia — pero deja de arrastrar a todo el mundo con él.

### Qué pragmas tocar, y cuáles persisten

Esta distinción es la que decide dónde va el código:

| Pragma | Valor | ¿Queda guardada en el archivo? |
|---|---|---|
| `journal_mode` | `WAL` | **Sí**, va en la cabecera del `.db` |
| `busy_timeout` | `5000` | No, es por conexión |
| `synchronous` | `NORMAL` | No, es por conexión |

`journal_mode` es la única que se graba en el archivo: se pone una vez y la
respetan todas las conexiones futuras, incluida la que abre Prisma después.
Por eso alcanza con activarla al arrancar, sin pelearse con los internos del
adaptador.

`busy_timeout` **ya está cubierto**: `better-sqlite3` usa 5000 ms por defecto,
así que si dos conexiones intentan escribir a la vez, la segunda reintenta
durante cinco segundos en lugar de fallar con `SQLITE_BUSY`. No hay que hacer
nada.

`synchronous=NORMAL` es una mejora de rendimiento opcional y **no la incluimos**:
es por conexión, obligaría a meterse con la conexión de Prisma, y a cambio de un
poco de velocidad acepta perder las últimas transacciones si se corta la luz del
servidor. Para un inventario que se digita a mano no vale la pena el canje.

### El código

Reemplazar `src/lib/db.ts` completo por esto:

```ts
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
```

### Un paso obligatorio antes: los tipos

`better-sqlite3` ya es dependencia del proyecto (`^13.0.3`), pero **el paquete
no trae tipos de TypeScript y `@types/better-sqlite3` no está instalado**. Hasta
ahora no hacía falta porque nadie lo importaba directamente: se usaba solo a
través del adaptador de Prisma. Este cambio es el primer `import` explícito, así
que sin esto `npm run typecheck` falla con `TS7016`.

```bash
npm install -D @types/better-sqlite3
```

Es dependencia de desarrollo: no pesa en el despliegue.

### Verificación

```bash
npm run typecheck
npm run dev          # arrancar una vez para que se aplique la pragma
```

Con el servidor **detenido**, comprobar que quedó grabado:

```bash
sqlite3 prisma/tienda.db "pragma journal_mode;"
# wal
```

Un detalle que confunde: los archivos `tienda.db-wal` y `tienda.db-shm`
aparecen al lado del `.db` **solo mientras hay una conexión abierta**. Al cerrar
la aplicación limpiamente, SQLite vuelca el WAL a la base y los borra. Que no
estén con el servidor apagado es lo normal, no una señal de que falló. La
respuesta de `pragma journal_mode` es la prueba real.

Ya están contemplados en el `.gitignore` de la raíz (`*.db-wal`, `*.db-shm`),
así que no hay nada que agregar ahí.

### Consecuencias operativas

Tres cosas que hay que saber al desplegar, ninguna requiere código:

**Los respaldos no se hacen con `cp`.** En WAL, las transacciones recientes
viven en el archivo `-wal` y todavía no están en el `.db`. Copiar solo el `.db`
da un respaldo incompleto y silencioso. Hay que usar el comando que ya está en
`docs/despliegue.md`, que sabe consolidar el WAL:

```bash
sqlite3 prisma/tienda.db ".backup respaldo-$(date +%F).db"
```

**WAL no funciona sobre disco de red.** Necesita memoria compartida entre
procesos, cosa que NFS y SMB no proveen de forma confiable. En el bloque local
del VPS no hay problema; solo hay que no mover el `.db` a un montaje de red.

**El archivo `-wal` se recorta solo.** SQLite hace *checkpoint* automático cada
1000 páginas (unos 4 MB). No hay que agendar mantenimiento.

---

## Tarea 2 · Guardado en lote atómico

### El problema

En `src/features/inventario/actions.ts`, el guardado recorre el formulario
escribiendo de a un producto:

```ts
for (const [clave, valor] of formData.entries()) {
  // ...
  await inventario.ajustar(productoId, sedeId, cantidad);
  cambios++;
}
```

Cada `ajustar()` es su propia transacción independiente. Si algo falla en el
producto número doce de cuarenta —se cae la conexión, se reinicia el proceso,
falla una escritura— quedan once cantidades guardadas y veintinueve no. El
usuario ve un error genérico y no tiene forma de saber cuáles entraron. Peor
todavía: reintentar el guardado completo es lo natural, y si el error era
intermitente, ahora tiene la sede a medio actualizar sin saberlo.

De paso son cuarenta confirmaciones a disco donde debería haber una sola.

### La decisión de diseño

**No metas `db.$transaction` dentro de `actions.ts`.**

La acción nunca importa `db` a propósito: solo conoce `inventario`, la interfaz
de `src/lib/inventario/`. Ese es justamente el enchufe que deja conectar el
sistema de facturación del local sin tocar pantallas (ver
`docs/integraciones.md`). Meter Prisma en la acción rompería esa separación, y
además sería sencillamente incorrecto cuando `INVENTARIO_PROVIDER="api"`, donde
no hay ninguna transacción de Prisma que abrir.

La forma correcta es **agregar la operación en lote al contrato**, y que cada
proveedor la resuelva como corresponda a su origen de datos. Son cinco archivos.

### 1. `src/lib/inventario/tipos.ts`

Agregar el tipo, arriba de la interfaz:

```ts
/** Una cantidad a fijar. El sedeId va aparte porque el lote es de una sola sede. */
export type CambioDeExistencia = {
  productoId: string;
  cantidad: number;
};
```

Y el método nuevo dentro de `interface InventarioProvider`, justo debajo de
`ajustar`:

```ts
  /** Fija la cantidad de un producto en una sede. */
  ajustar(productoId: string, sedeId: string, cantidad: number): Promise<void>;

  /**
   * Fija varias cantidades de una misma sede en una sola operación atómica.
   *
   * Existe porque el guardado real del panel es una tabla entera, no un
   * producto suelto: si a la mitad falla algo, no puede quedar media sede
   * actualizada sin que nadie se entere. O entran todos los cambios o no entra
   * ninguno.
   *
   * También es cuestión de velocidad: cuarenta escrituras sueltas son cuarenta
   * confirmaciones a disco; dentro de una transacción es una sola.
   */
  ajustarLote(sedeId: string, cambios: CambioDeExistencia[]): Promise<void>;
```

### 2. `src/lib/inventario/prisma.ts`

Agregar `CambioDeExistencia` al import de tipos, y reemplazar el método
`ajustar` del final del archivo por esto:

```ts
/** Normaliza lo que llega del formulario: enteros, nunca negativos. */
function normalizar(cantidad: number): number {
  return Math.max(0, Math.trunc(cantidad));
}

/**
 * Se define como función suelta —y no como método del objeto— para que
 * `ajustar` pueda reutilizarla sin depender de `this`.
 */
async function ajustarLote(
  sedeId: string,
  cambios: CambioDeExistencia[]
): Promise<void> {
  if (cambios.length === 0) return;

  // La forma de arreglo de $transaction manda todas las consultas dentro de
  // una sola transacción: si una falla, se revierten todas.
  await db.$transaction(
    cambios.map(({ productoId, cantidad }) =>
      db.existencia.upsert({
        where: { productoId_sedeId: { productoId, sedeId } },
        update: { cantidad: normalizar(cantidad), origen: "local" },
        create: {
          productoId,
          sedeId,
          cantidad: normalizar(cantidad),
          origen: "local",
        },
      })
    )
  );
}
```

Y dentro de `export const proveedorPrisma`, dejar los dos métodos así:

```ts
  async ajustar(productoId, sedeId, cantidad) {
    // Un ajuste suelto es un lote de uno: una sola implementación que mantener.
    await ajustarLote(sedeId, [{ productoId, cantidad }]);
  },

  ajustarLote,
```

### 3. `src/lib/inventario/apiExterna.ts`

El espacio reservado tiene que cubrir el método nuevo o TypeScript va a
protestar. Agregarlo después de `ajustar`:

```ts
  async ajustarLote(
    _sedeId: string,
    _cambios: CambioDeExistencia[]
  ): Promise<void> {
    // TODO: un solo POST con todas las cantidades.
    //       Igual que porProductos, no lo resuelvas llamando a ajustar() en un
    //       bucle: además de lento, perdés la atomicidad que es justamente el
    //       punto de este método. Si el sistema externo no ofrece un endpoint
    //       en lote, documentalo acá y avisá al usuario en la pantalla.
    return faltaConfiguracion();
  },
```

Agregando `CambioDeExistencia` al import de tipos de arriba del archivo.

### 4. `src/lib/inventario/index.ts`

Reexportar el tipo nuevo para que las pantallas lo importen desde el índice y
no desde `tipos.ts`:

```ts
export type {
  CambioDeExistencia,
  ExistenciaSede,
  InventarioProvider,
} from "@/lib/inventario/tipos";
```

### 5. `src/features/inventario/actions.ts`

El bucle deja de escribir y pasa a juntar. Reemplazar desde
`const anteriores = ...` hasta el `return exito(...)` final:

```ts
    const anteriores = await inventario.porSede(sedeId);
    const cambios: CambioDeExistencia[] = [];

    for (const [clave, valor] of formData.entries()) {
      if (!clave.startsWith("cantidad_")) continue;

      const productoId = clave.slice("cantidad_".length);
      const cantidad = Math.max(
        0,
        Number(String(valor).replace(/[^\d]/g, "")) || 0
      );

      // Solo se manda lo que cambió: así una tabla de 200 filas no dispara
      // 200 escrituras cada vez que se toca un número.
      if (anteriores.get(productoId)?.cantidad === cantidad) continue;

      cambios.push({ productoId, cantidad });
    }

    if (cambios.length === 0) return exito("No había nada que cambiar.");

    // Una sola operación: o entran los N cambios o no entra ninguno.
    await inventario.ajustarLote(sedeId, cambios);

    // Las revalidaciones van después de que la transacción confirmó. Nunca
    // adentro: invalidarían el caché con datos que todavía pueden revertirse.
    revalidatePath("/");
    revalidatePath("/admin/inventario");
    revalidatePath("/admin/productos");

    const total = cambios.length;
    return exito(
      `${total} ${total === 1 ? "cantidad actualizada" : "cantidades actualizadas"}.`
    );
```

Y agregar `CambioDeExistencia` al import de `@/lib/inventario`:

```ts
import { inventario, type CambioDeExistencia } from "@/lib/inventario";
```

### Verificación

```bash
npm run typecheck
npm run lint
```

Prueba manual: entrar a `/admin/inventario`, cambiar tres cantidades de una
sede, guardar, recargar y confirmar que las tres quedaron.

**Prueba de atomicidad** (la que importa). Agregar temporalmente una consulta
que falla al final de la transacción, en `ajustarLote`:

```ts
  await db.$transaction([
    ...cambios.map(({ productoId, cantidad }) =>
      db.existencia.upsert({ /* ... igual que arriba ... */ })
    ),
    // TEMPORAL — borrar después de la prueba.
    db.$executeRawUnsafe("SELECT esta_funcion_no_existe()"),
  ]);
```

Guardar varias cantidades desde el panel: la acción tiene que fallar y, al
recargar, **ninguna** cantidad debe haber cambiado. Antes del cambio, esa misma
prueba dejaba todas las filas escritas. Acordate de borrar la línea temporal.

### Lo que este cambio NO arregla

Que quede claro para no dar por cubierto algo que sigue abierto: **si dos
personas editan la misma sede al mismo tiempo, la segunda en guardar pisa a la
primera sin aviso.**

Hay un caso puntualmente feo: `anteriores` se lee en el momento de guardar, no
cuando se cargó la pantalla. Si alguien tenía el formulario abierto, otro cambió
una cantidad mientras tanto, y el primero guarda sin tocar ese campo, el valor
viejo se vuelve a escribir y revierte el cambio del otro.

Esto no es un defecto de SQLite —pasa igual en SQL Server o Postgres sin
bloqueo optimista— y no es lo que resuelve esta tarea. La solución sería usar
`Existencia.actualizadoEn` como testigo de versión: mandarlo en el formulario y
rechazar el guardado si cambió en el medio, avisando qué filas quedaron
desactualizadas. Es una tarea aparte, con su propio diseño de interfaz.

Vale aclarar que el escenario más común —**cada sucursal cargando su propia
sede**— no colisiona nunca: `existencias` tiene índice único
`(productoId, sedeId)`, así que son filas distintas y no compiten.

---

## Cierre

Checklist antes de dar por terminado:

- [ ] `pragma journal_mode` devuelve `wal` con el servidor apagado
- [ ] `npm run typecheck` sin errores
- [ ] `npm run lint` sin errores
- [ ] Guardado de varias cantidades funciona de punta a punta
- [ ] Prueba de atomicidad: falla y no escribe nada
- [ ] Línea temporal de la prueba borrada
- [ ] Dos commits separados

### Cómo revertir

**Tarea 1** — quitar la llamada a `activarWal` y devolver el archivo a su modo
anterior:

```bash
sqlite3 prisma/tienda.db "pragma journal_mode=DELETE;"
```

**Tarea 2** — es un cambio de código puro, sin efectos en los datos: alcanza con
revertir el commit.

### Si más adelante migran a Turso o D1

`activarWal` ya se desactiva sola con bases remotas (el `if` de `://`), así que
no estorba. `ajustarLote` es una mejora igual de válida ahí: ambas manejan
transacciones y la llamada en lote además ahorra viajes de red, que en una base
remota pesan mucho más que el disco local.
