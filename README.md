# Blueprint — catálogo con existencias por sede

Plantilla base del producto. Se clona por cliente: catálogo en línea con
existencias por sede, y un panel de administración para que la tienda mantenga
su catálogo sin tocar código.

- **Catálogo público** (`/`): abierto para cualquiera. Buscador, filtro por
  categoría, por sede y por marca, y cotización por WhatsApp en un clic.
- **Panel** (`/admin`): requiere cuenta. CRUD de productos, existencias,
  categorías, marcas, sedes, usuarios y configuración del negocio.

Costo de operación: **$0**. Todo el stack tiene plan gratuito.

---

## Arrancar por primera vez

Requiere Node.js 20.19 o superior.

```bash
npm install && cp .env.example .env && npm run setup && npm run dev
```

En Windows con PowerShell, reemplazá `cp` por `Copy-Item`.

Eso instala, crea la base de datos, la carga con los datos de
`prisma/datos-iniciales.ts` y levanta el sitio en <http://localhost:3000>.

De fábrica esos datos son un ejemplo mínimo (una sede, una categoría, dos
productos) que sirve para comprobar que la carga funciona de punta a punta.
Reemplazalos con los del cliente antes de mostrar nada: ver
[Clonar esto a un cliente](#clonar-esto-a-un-cliente).

**Usuario inicial:** el que definas en `.env` antes de correr `npm run setup`,
con las variables `ADMIN_EMAIL` y `ADMIN_PASSWORD`.

Los valores que trae `.env.example` son de relleno y sirven solo para levantar
el proyecto en tu máquina. La aplicación avisa por consola mientras sigan
puestos y **se niega a arrancar en producción** con el `SESSION_SECRET` de
ejemplo. Ver [docs/despliegue.md](docs/despliegue.md).

> **Antes de exponer el sitio a internet** —aunque sea una demo temporal por un
> tunnel— cambiá el correo y la contraseña del administrador:
>
> ```bash
> npm run admin:password
> ```
>
> El detalle está en [docs/demo-tunnel.md](docs/demo-tunnel.md).

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Levanta el sitio en modo desarrollo |
| `npm run build` | Compila para producción |
| `npm start` | Sirve la versión compilada |
| `npm run setup` | Migra la base, genera el cliente y carga los datos |
| `npm run db:migrate` | Crea una migración después de cambiar el schema |
| `npm run db:seed` | Vuelve a cargar los datos iniciales (no duplica nada) |
| `npm run db:studio` | Abre un explorador visual de la base de datos |
| `npm run typecheck` | Revisa los tipos sin compilar |

## Cómo está organizado

```
src/
├─ app/                    rutas (Next.js App Router)
│  ├─ (publico)/           catálogo abierto: home, producto, sedes
│  ├─ admin/               panel protegido
│  ├─ login/  logout/      entrada y salida
│  └─ api/v1/              API pública de solo lectura
├─ features/               una carpeta por dominio del negocio
│  ├─ productos/           schemas · queries · actions · components
│  ├─ categorias/ marcas/ sedes/ inventario/ usuarios/
│  ├─ configuracion/ auth/ catalogo/
├─ components/ui/          botones, campos, mensajes, paneles, logo
├─ lib/                    reglas transversales
│  ├─ db.ts                cliente de Prisma
│  ├─ session.ts           firma y verificación de la cookie
│  ├─ guards.ts            quién puede entrar a qué
│  ├─ entorno.ts           corta el arranque si hay valores de ejemplo
│  ├─ rateLimit.ts         límite de intentos del login
│  ├─ stock.ts             cantidad → en stock / últimas / agotado
│  ├─ precio.ts            si un precio se publica o no
│  ├─ money.ts             la moneda, en una sola constante
│  ├─ region.ts            el idioma y el formato de fecha
│  ├─ inventario/          de dónde salen las existencias
│  └─ storage/             dónde se guardan las imágenes
└─ proxy.ts                redirección rápida al login
```

Agregar una funcionalidad nueva es crear una carpeta en `features/` con sus
tres archivos y una ruta en `app/`. No hay que tocar lo que ya existe.

## Tres decisiones que conviene conocer

**1. El estado de las existencias nunca se guarda.** Se deriva de la cantidad
en `lib/stock.ts` (0 → agotado, ≤ umbral → últimas unidades, resto → en stock).
Si se guardara, tarde o temprano habría un producto con cantidad 0 marcado como
disponible.

**2. Las existencias se leen a través de una interfaz, no de la tabla.**
`lib/inventario/` define el contrato. Hoy lo cumple la base de datos local;
mañana lo puede cumplir el sistema de facturación del local sin tocar ninguna
pantalla. Ver [docs/integraciones.md](docs/integraciones.md).

**3. Publicar precios es una decisión, no un supuesto.** Hay tiendas que no
publican precios. El interruptor global está en `/admin/configuracion` y cada
producto puede hacer su excepción. Toda la interfaz y la API consultan
`lib/precio.ts`, así que no hay forma de que un precio oculto se escape por
algún lado.

## Clonar esto a un cliente

1. Copiá la carpeta y renombrala.
2. Editá **`prisma/datos-iniciales.ts`**: identidad del negocio, sedes, marcas,
   árbol de categorías y productos. Es el único archivo con datos del cliente.
3. Definí `ADMIN_EMAIL`, `ADMIN_PASSWORD` y un `SESSION_SECRET` propio en `.env`.
4. `npm run setup`.
5. Subí el logo y ajustá lo que falte desde `/admin/configuracion`.

La identidad completa vive en la tabla `Configuracion`, que se llena desde la
constante `NEGOCIO` de `prisma/datos-iniciales.ts`. Ningún componente tiene el
nombre de la tienda escrito a mano: cambiar esa constante (o editar
`/admin/configuracion`) rebrandea el sitio entero, el panel y el login.

Lo que **no** se rebrandea solo:

| Qué | Dónde | Cuándo hay que tocarlo |
|---|---|---|
| Moneda | `src/lib/money.ts`, constante `MONEDA` | Cliente de otro país |
| Idioma y formato de fecha | `src/lib/region.ts`, constante `LOCALE` | Cliente de otro país |
| Copy de venta | Bloques marcados `COPY A MEDIDA DEL CLIENTE` | Siempre, es lo que se personaliza |

El titular de la portada **no** está en esa lista: sale del eslogan de
`/admin/configuracion`, así que el cliente lo cambia solo. Los bloques de copy
son la franja de promesas y los servicios del pie, más el placeholder del
buscador: son argumentos de venta, no identidad, así que viven en el código.
Meterlos en la base convertiría el formulario de configuración en un editor de
contenidos, que es otro proyecto.

El vocabulario de la interfaz es genérico ("producto", no "repuesto"), así que
sirve para cualquier rubro sin tocar nada.

El checklist completo está en [docs/auditoria.md](docs/auditoria.md).

## Documentación

- [docs/despliegue.md](docs/despliegue.md) — publicar el sitio gratis
- [docs/demo-tunnel.md](docs/demo-tunnel.md) — mostrar una demo sin comprar dominio
- [docs/integraciones.md](docs/integraciones.md) — conectar el sistema de facturación
- [docs/decisiones.md](docs/decisiones.md) — por qué cada pieza del stack
- [docs/auditoria.md](docs/auditoria.md) — revisión de seguridad y qué se endureció
- [docs/tareas-concurrencia.md](docs/tareas-concurrencia.md) — SQLite, WAL y escrituras simultáneas
