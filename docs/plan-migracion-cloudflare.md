# Plan de migración del blueprint a Cloudflare (Worker + D1 + R2)

Plan de **ejecución** del "Camino A" (todo Cloudflare) descrito en
[`cloudflare-d1-r2-dos-caminos.html`](./cloudflare-d1-r2-dos-caminos.html)
(análisis y costos). Convierte en pasos concretos el apunte de diseño
[`apunte_conexion_d1_r2.md`](./apunte_conexion_d1_r2.md). Preparado: 2026-10-15.

> **Decisión del dueño (2026-10-15):** la migración se hace sobre **este blueprint**
> (el template base del catálogo), NO sobre una instancia como `chubby/`. Objetivo:
> que **todo clon futuro nazca ya con la opción Cloudflare** (Workers + D1 + R2). El
> blueprint ahora vive en su propio repo: **`KowairoG/BlueprintCatalogoWeb`**.

## Principio rector: intercambiable por cliente, no reemplazo

La gracia del blueprint es clonarse cambiando **datos y configuración, no código**
(ver `apunte_conexion_d1_r2.md` y `integraciones.md`). Por eso D1 y R2 **no**
sustituyen a SQLite-local y disco: se agregan como **proveedores elegibles por env**,
igual que ya se hizo con el inventario (`INVENTARIO_PROVIDER`):

| Cliente | Datos | Imágenes |
|---|---|---|
| Chico / demo | SQLite local (lo actual) | Disco `public/uploads` (lo actual) |
| Producción | **D1** | **R2** |

Se elige por variable de entorno, **sin tocar las pantallas**.

---

## Punto de partida (verificado en el código)

| Pieza | Hoy | Archivo |
|---|---|---|
| Runtime | Next.js **16.3.0** (App Router, server actions) | [`package.json`](../package.json) |
| BD | SQLite por `better-sqlite3` + adapter | [`src/lib/db.ts`](../src/lib/db.ts) |
| Imágenes | Disco local, ya **abstraído** tras `StorageProvider` | [`src/lib/storage/`](../src/lib/storage/) |
| Auth | `jose` (JWT) + `bcryptjs` | — |
| Config | `DATABASE_URL`, `SESSION_SECRET`, `STORAGE_PROVIDER`, `ORIGENES_PERMITIDOS`, `SITIO_INDEXABLE` | [`.env.example`](../.env.example) |

Dos cosas **ya juegan a favor**:

- El esquema ya es `provider = "sqlite"` → **D1 es SQLite por dentro**, el modelo no cambia.
- El storage ya está tras una interfaz con hueco para R2: ver el comentario en
  [`src/lib/storage/index.ts`](../src/lib/storage/index.ts). Y `db.ts` ya cortocircuita
  el modo WAL para bases remotas (`if (ruta.includes("://")) return;`).

---

## Los 3 riesgos reales (leer antes de empezar)

1. **Next 16 sobre OpenNext.** `@opennextjs/cloudflare` es el camino, pero el template
   está en **Next 16.3.0** (versión muy nueva, breaking changes según `AGENTS.md`).
   Límites conocidos: **Node Middleware no soportado** y **tope del Worker (3 MiB free /
   10 MiB paid)**. → Se valida en la **Fase 0 (PoC)** antes de comprometer nada.
2. **`bcryptjs` vs CPU de Workers.** El plan **Free** da ~10 ms de CPU/invocación; un
   hash de bcrypt tarda más y el login podría cronometrar fuera. → Workers **Paid**
   ($5) o bajar el cost factor; medir en preview.
3. **Bindings por request.** En Workers no hay `DATABASE_URL`: D1/R2 llegan como
   *bindings* (`env.DB`, `env.FOTOS`) y el singleton global de `db.ts` no aplica igual.
   → Resolver el binding por request con `getCloudflareContext()` de OpenNext.

---

## Fase 0 — PoC de riesgo (gate, ~medio día)

**Objetivo:** probar que *este* Next (16.3.0) compila y corre bajo OpenNext en Workers,
ANTES de tocar BD o imágenes.

- [ ] En **WSL/Linux** (OpenNext lo recomienda): instalar `@opennextjs/cloudflare` + `wrangler`.
- [ ] `open-next.config.ts` mínimo + `wrangler.jsonc` con `nodejs_compat`.
- [ ] `opennextjs-cloudflare build` → sin Node Middleware y bajo el tope de tamaño.
- [ ] `opennextjs-cloudflare preview` → el catálogo renderiza en workerd (aún contra
      SQLite/local, sin D1/R2 todavía).

**Hecho =** la app levanta en el preview de Workers. **Si falla:** documentar el bloqueo
(versión de OpenNext que soporte Next 16, o esperar) y parar acá.

---

## Fase 1 — Proveedor R2 (lo nuevo de verdad; bajo riesgo, independiente)

**Objetivo:** agregar R2 como proveedor de almacenamiento **elegible**, sin quitar el local.

- [ ] Nuevo `src/lib/storage/r2.ts` que implemente `StorageProvider` (`guardar`/`borrar`
      + url pública) contra el binding `env.FOTOS`. Registrarlo en `PROVEEDORES` de
      [`src/lib/storage/index.ts`](../src/lib/storage/index.ts) (al lado de `local`).
- [ ] `STORAGE_PROVIDER="r2"` lo activa; `"local"` (default) sigue igual para demos.
- [ ] Documentar las variables nuevas en [`.env.example`](../.env.example).
- [ ] Ajustar cómo se arma/lee la URL guardada en `ProductoImagen.url` (hoy
      `/uploads/<clave>`; con R2 público pasa a `https://fotos.<cliente>.cr/<clave>`).
- [ ] Script de una pasada: subir fotos existentes a R2 + reescribir URLs (solo al
      convertir una instancia ya desplegada).

**Hecho =** con `STORAGE_PROVIDER=r2` el catálogo sirve fotos desde R2 y el admin sube/borra;
con `local` todo sigue como hoy.

---

## Fase 2 — Proveedor D1 (datos elegibles por env) — ✅ PoC LOGRADO (2026-10-15)

**Objetivo:** que Prisma pueda hablar con D1 por binding, manteniendo SQLite-local.
**Resultado:** el app renderiza en workerd leyendo de una D1 local (`/`, `/sedes`,
`/login` → HTTP 200; una sede insertada en D1 aparece en `/sedes`).

- [x] **Selección por env `DB_PROVIDER = sqlite-local | d1`** en
      [`src/lib/db.ts`](../src/lib/db.ts). `sqlite-local` (default) = `@prisma/adapter-better-sqlite3`;
      `d1` = `@prisma/adapter-d1` con el binding resuelto por request vía
      `getCloudflareContext()`. Para no tocar los 21+ sitios que importan `db`, el
      cliente se crea **perezosamente** detrás de un `Proxy` (el binding solo existe
      dentro del request, no al importar el módulo).
- [x] Esquema aplicado a D1: `prisma/migrations/*/migration.sql` concatenado →
      `wrangler d1 execute <db> --local --file=…` (SQL estándar, sin PRAGMA → apto para D1).
- [x] Binding `DB` + `DB_PROVIDER=d1` en [`wrangler.jsonc`](../wrangler.jsonc).

> **⚠️ Gotcha grande (resuelto) — Prisma 7 en workerd ([prisma#28657](https://github.com/prisma/prisma/issues/28657)).**
> El cliente por defecto compila el **query compiler WASM en runtime**, y workerd lo
> prohíbe (`Wasm code generation disallowed by embedder`). **Solución:** generar un
> cliente con `runtime = "workerd"` (importa el WASM precompilado). Como ese cliente
> NO corre en Node, el schema usa **dos generadores**: `client` (Node, para
> `next dev`/VPS) y `clientWorkerd` (`../src/generated/prisma-workerd`, para D1).
> `db.ts` importa el que corresponde al proveedor. Requiere `compatibility_date`
> ≥ 2025-06-01 (usamos 2025-09-23). Versiones alineadas: `prisma`/`@prisma/client`/
> `@prisma/adapter-d1` todas 7.9.1.

**Pendiente de fase (no bloquea el PoC):** seed real contra D1 (clon nuevo) o
`wrangler d1 import` del `.db` de una instancia existente; D1 real (no local) vía
`wrangler d1 create` (necesita login de Cloudflare).

**Hecho =** con `DB_PROVIDER=d1` la app lee/escribe en D1; con `sqlite-local`, en el archivo.

---

## Fase 3 — Next en Workers + secrets + deploy

- [ ] `wrangler.jsonc` con los bindings `DB` (D1) y `FOTOS` (R2).
- [ ] Secrets por `wrangler secret put`: `SESSION_SECRET`, credenciales admin del seed, etc.
      (Las guardas que **se niegan a arrancar** con los valores de ejemplo siguen aplicando.)
- [ ] Resolver `bcryptjs`/CPU: Workers **Paid** o bajar cost factor; medir el login.
- [ ] `ORIGENES_PERMITIDOS`: con dominio propio y sin túnel, Origin == Host → en principio
      vacío; confirmar que las server actions (incluido el login) pasen.
- [ ] `opennextjs-cloudflare deploy`.

**Hecho =** el catálogo corre en `*.workers.dev` con D1 + R2, login y admin OK.

---

## Fase 4 — Dominio, indexación, respaldos

- [ ] Dominio del cliente → Worker (SSL automático).
- [ ] `SITIO_INDEXABLE`: `noindex` en demo, indexable en real (se resuelve al compilar).
- [ ] **Respaldos en dos capas:** Time Travel (7 días free / 30 paid) + `wrangler d1 export`
      a un bucket R2 como seguro contra desastre de cuenta.

**Hecho =** dominio final con SSL, indexación correcta y respaldos verificados.

---

## Qué NO cambia

- El **modelo de datos** (`schema.prisma`) — sigue siendo SQLite por dentro.
- La **lógica de negocio**, las pantallas y el panel admin.
- Los **proveedores locales** (SQLite + disco) siguen siendo el default para demos.
- El patrón de **clonar por cliente**: cada tienda = su propia D1 + bucket, por config.

## Orden recomendado

Fase 0 primero (es el *gate*). Si pasa: Fase 1 (R2) es el mayor beneficio con menor
riesgo y sirve hasta en el VPS actual. Fases 2–3 juntas (D1 + runtime). Fase 4 cierra.
No meter esto en el camino crítico de un primer lanzamiento: la vía SQLite-local + VPS
(`docs/despliegue.md`) funciona sin tocar código; Cloudflare es el destino, no la urgencia.
