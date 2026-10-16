# Apunte pendiente — Conexión a Cloudflare D1 y R2 en el blueprint

> Nota de trabajo (no es doc final). Anotado el 26 ago 2026. Kowairog sigue
> analizando; esto queda como recordatorio de qué falta agregar al blueprint.

## Qué falta

Agregar al blueprint los **métodos para conectarse a D1 (base de datos) y a R2
(archivos/imágenes)**. Hoy el blueprint asume SQLite local (`chubby.db` vía
Prisma) y fotos como archivos en disco. Falta el camino Cloudflare.

## La clave: es un blueprint, se adapta por cliente

No hardcodear D1/R2. La gracia del blueprint es clonarlo a otra tienda cambiando
**datos y configuración, no código**. Entonces el almacenamiento tiene que ser
**intercambiable por cliente**, igual que ya se hizo con el inventario:

- Cliente chico / demo  → SQLite local + fotos en disco (lo actual).
- Cliente en producción → **D1** para los datos + **R2** para las imágenes.

Se elige por variable de entorno, sin tocar las pantallas.

## Reusar el patrón que ya existe

Mirar `docs/integraciones.md`: el inventario ya está detrás de una interfaz
(`InventarioProvider`) con implementaciones elegibles por `INVENTARIO_PROVIDER`.
Aplicar el **mismo patrón "enchufe"** a dos capas nuevas:

### 1. Base de datos (D1)
- Prisma sigue con schema SQLite; cambia solo el **driver adapter** (D1 usa el
  adapter oficial de Prisma para D1, por binding en Workers, o HTTP API fuera).
- Selección por env, ej. `DB_PROVIDER = sqlite-local | d1`.
- Migraciones y seed (`datos-iniciales.ts`) deben poder correr contra D1.

### 2. Almacenamiento de archivos (R2)  ← esto es lo nuevo de verdad
- Crear una interfaz tipo `AlmacenamientoProvider` con métodos:
  - `subir(archivo, ruta)` → devuelve URL pública
  - `borrar(ruta)`
  - `urlPublica(ruta)`
- Implementaciones: `discoLocal.ts` (actual) y `r2.ts` (bucket R2).
- En la base solo se guarda la URL (ya lo hace `ProductoImagen.url`), así que el
  modelo de datos NO cambia — solo de dónde sale esa URL.
- Elegir por env, ej. `STORAGE_PROVIDER = local | r2`.

## Pendientes concretos (cuando se implemente)
- [ ] Definir la interfaz `AlmacenamientoProvider` + espacio reservado (TODO),
      igual que `apiExterna.ts` del inventario.
- [ ] Adapter de Prisma para D1 seleccionable por env.
- [ ] Documentar variables nuevas en `.env.example`.
- [ ] Script de una pasada: subir fotos existentes a R2 y reescribir URLs.
- [ ] Nota en `docs/decisiones.md` explicando por qué se dejó intercambiable.

## Contexto / referencia
Análisis completo de los dos caminos (todo-Cloudflare vs conservador) y costos:
`../../Cloudflare_D1_R2_dos_caminos.html` (raíz de idk_sell_a_software).
