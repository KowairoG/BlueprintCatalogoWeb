# Integraciones

Dos enchufes quedaron listos desde la versión 1 para que conectarlos después no
obligue a reescribir el sitio.

---

## 1. Existencias desde un sistema externo

Hoy la tienda digita las cantidades en `/admin/inventario`. Cuando tengan un
sistema de facturación o punto de venta, el stock debería venir de ahí: es la
única forma de que el catálogo diga la verdad sin trabajo doble.

### Cómo está preparado

Ninguna pantalla consulta la tabla `existencias`. Todo pasa por una interfaz:

```
src/lib/inventario/
├─ tipos.ts        el contrato: InventarioProvider
├─ prisma.ts       implementación actual (lee esta base de datos)
├─ apiExterna.ts   ← el espacio reservado, con los métodos marcados TODO
└─ index.ts        elige uno según INVENTARIO_PROVIDER
```

### Qué hay que hacer

**Paso 1 — Cargar los códigos externos.** Cada producto tiene un campo
`codigoExterno` en `/admin/productos/<id>`. Es como lo identifica el otro
sistema. Sin esto no hay forma de cruzar los datos.

**Paso 2 — Implementar los cinco métodos** de `src/lib/inventario/apiExterna.ts`:

| Método | Qué debe devolver |
|---|---|
| `porProducto(id)` | existencias de un producto en todas las sedes |
| `porProductos(ids)` | lo mismo para varios, **en una sola llamada** |
| `porSede(sedeId)` | todo el stock de una sede |
| `ajustar(...)` | escribe una cantidad (o lanza error si el externo manda) |
| `ajustarLote(...)` | escribe varias cantidades de una sede, **todo o nada** |

Tres reglas al implementarlos:

- `porProductos` es el más importante para el rendimiento. El catálogo lo llama
  una vez por página; si se resuelve llamando a `porProducto` en un bucle, una
  página de 40 productos hace 40 peticiones.
- `ajustarLote` tampoco se resuelve con un bucle de `ajustar`: además de lento,
  se pierde la atomicidad, que es justamente para lo que existe. Si el sistema
  externo no ofrece un endpoint en lote, dejalo documentado y avisá en pantalla.
- El campo `estado` **no viene de la API**: se calcula con `estadoDeStock()` de
  `src/lib/stock.ts`. Así la regla de "últimas unidades" sigue siendo una sola
  en todo el sistema.

**Paso 3 — Activarlo** en `.env`:

```env
INVENTARIO_PROVIDER="api"
INVENTARIO_API_URL="https://sistema-del-local/api"
INVENTARIO_API_TOKEN="..."
```

**Paso 4 — Decidir quién manda.** Si el sistema externo es la autoridad del
stock, dejar `soloLectura: true`. El panel muestra las cantidades pero
deshabilita la edición automáticamente, y avisa de dónde vienen los datos. No
hay que tocar ninguna pantalla para eso.

### Verificar que el enchufe sigue vivo

Poner `INVENTARIO_PROVIDER="api"` sin implementar nada tiene que fallar con un
mensaje claro que explique las dos salidas posibles, no con un error críptico.
Si algún día falla de otra forma, algo se rompió en la capa.

---

## 2. Que otros consulten el catálogo

La dirección contraria ya está resuelta y funcionando: dos endpoints públicos
de solo lectura.

### `GET /api/v1/productos`

Parámetros opcionales: `q`, `categoria`, `sede`, `marca`.

```json
{
  "version": 1,
  "total": 22,
  "preciosPublicos": true,
  "productos": [
    {
      "sku": "CH-ACC-001",
      "nombre": "Maneta CNC ajustable freno + clutch",
      "slug": "maneta-cnc-ajustable-freno-clutch",
      "categoria": "accesorios",
      "marca": "generico",
      "precio": 32500,
      "precioAnterior": 38000,
      "moneda": "CRC",
      "existencias": [{ "sede": "canas", "estado": "hay" }]
    }
  ]
}
```

### `GET /api/v1/existencias`

Parámetros opcionales: `sede`, `sku`.

```json
{
  "version": 1,
  "origen": "Base de datos local",
  "productos": [
    {
      "sku": "CH-ACC-001",
      "sedes": [
        { "sede": "canas", "estado": "hay", "disponible": true }
      ]
    }
  ]
}
```

### Dos cosas que la API no publica, a propósito

- **La cantidad exacta.** Se devuelve el estado (`hay` / `poco` / `agotado`) y
  un booleano. Cuánto inventario tiene el local es información de negocio.
- **Los precios ocultos.** Si `/admin/configuracion` tiene los precios apagados,
  la clave `precio` simplemente no aparece en la respuesta. La regla es la misma
  que usa el sitio (`lib/precio.ts`), así que no puede desincronizarse.

---

## 3. Imágenes en la nube

`src/lib/storage/` funciona igual que el inventario: una interfaz y una
implementación intercambiable.

Hoy `localDisk.ts` guarda en `public/uploads`. Sirve para desarrollo y para un
VPS, pero **no para Vercel**, donde el disco es efímero.

Para migrar a Cloudflare R2 (10 GB gratis) o Supabase Storage (1 GB gratis):

1. Crear `src/lib/storage/r2.ts` implementando `StorageProvider` — son dos
   métodos, `guardar()` y `borrar()`.
2. Registrarlo en el objeto `PROVEEDORES` de `src/lib/storage/index.ts`.
3. Poner `STORAGE_PROVIDER="r2"` en `.env`.

El formulario de productos no se toca: solo conoce la interfaz.
