# Decisiones

Por qué el proyecto es como es. Sirve para retomarlo dentro de un año sin
tener que reconstruir el razonamiento.

---

## El punto de partida

El sistema salió de un caso real: una tienda con varias sedes, sin
catálogo en línea, que contestaba por WhatsApp todo el día la misma pregunta
—*¿tienen esta pieza?, ¿en cuál sede?*— y que no publicaba precios.

De ahí salen las tres decisiones de fondo que están más abajo: existencias por
sede, precio opcional, y un panel que la tienda pueda usar sin llamar a nadie.

Antes de escribir una línea para un cliente nuevo conviene tener lo mismo que
se tuvo entonces:

- **Relevamiento del negocio** — qué venden, cuántas sedes, las marcas que
  manejan, si publican precios o no, y por dónde les llegan las consultas hoy.
  La fuente suele ser su página de Facebook o Instagram.
- **Estructura del catálogo** — qué categorías madre y qué subcategorías. Se
  puede copiar la de una tienda grande del mismo rubro y podarla.
- **Un puñado de productos reales con fotos** — alcanza con 20 para que la demo
  se vea como su tienda y no como una plantilla.

Eso es exactamente lo que se carga en `prisma/datos-iniciales.ts`. La demo se
gana mostrándole al cliente **sus** productos, no productos de ejemplo.

---

## Stack

Restricción de partida: **una tienda de barrio no tiene capital para hosting,
las herramientas tienen que ser gratis.**

| Pieza | Elección | Por qué |
|---|---|---|
| Framework | Next.js (App Router) | Un solo proyecto sirve el sitio público y el panel. Se despliega gratis |
| Base de datos | SQLite + Prisma | Es un archivo. Cero servidor, cero cuenta, cero costo. Migra a Turso o Neon sin cambiar el schema |
| Estilos | Tailwind | La paleta del prototipo se declara una vez en `globals.css` |
| Sesión | `jose` + `bcryptjs` | Ver abajo |
| Validación | Zod | El mismo esquema valida el formulario y el servidor |

### Por qué no Auth.js

Auth.js v5 sigue en beta y su integración con middleware + Prisma exige partir
la configuración en dos archivos y lidiar con el runtime del edge. Para un
backoffice de tienda con email y contraseña, una cookie httpOnly con un JWT
firmado son unas 100 líneas, no tiene dependencias en beta y funciona en
cualquier runtime.

Si algún día quieren entrar con Google, migrar a Auth.js es directo: la sesión
ya está aislada en `src/lib/session.ts`.

---

## Tres reglas que no se negocian

### 1. El estado de las existencias se deriva, no se guarda

`src/lib/stock.ts` traduce cantidad → `hay` / `poco` / `agotado`. Ese cálculo
existe en **un solo lugar** y no hay ninguna columna que lo duplique.

Guardarlo parece más rápido hasta el día en que aparece un producto con
cantidad 0 marcado como disponible, alguien cruza el pueblo por él, y no está.
Ese error cuesta un cliente; el cálculo no cuesta nada.

### 2. El precio se consulta, nunca se lee directo

Ninguna pantalla lee `producto.precio`. Todo pasa por `src/lib/precio.ts`, que
aplica la jerarquía producto → política global.

Hay tiendas que no publican precios en Facebook. Eso puede ser una decisión
comercial deliberada, así que el sistema no la fuerza: hay un interruptor global y una
excepción por producto. Pero si la regla estuviera repetida en la tarjeta, en
el detalle, en el panel y en la API, tarde o temprano una de las cuatro copias
se olvida y un precio "oculto" aparece en el JSON.

El precio **se sigue guardando aunque esté oculto**: es el control interno de la
tienda, y prenderlo después es un clic.

### 3. Las existencias se piden a una interfaz, no a la tabla

`src/lib/inventario/` define el contrato y hoy lo cumple la base local. El día
que el stock venga del sistema de facturación, se escribe una implementación y
se cambia una variable de entorno. Ninguna pantalla se entera.

Esto costó unas pocas horas ahora y ahorra una reescritura después. Ver
[integraciones.md](integraciones.md).

---

## Autorización: dos barreras, no una

- **`src/proxy.ts`** hace un chequeo optimista: si no hay cookie válida,
  redirige al login sin renderizar nada. Es rapidez, no seguridad.
- **`src/lib/guards.ts`** es la barrera real. La llaman todas las páginas del
  panel y **todas** las server actions.

Lo segundo no es redundancia. Una server action es un endpoint POST real: se
puede invocar directamente con `curl`, sin pasar nunca por la interfaz. Si la
única verificación estuviera en el proxy o en esconder un botón, cualquiera
podría borrar productos.

`guards.ts` además consulta la base en cada request, no confía en el token: si
a alguien le desactivan la cuenta, pierde el acceso de inmediato en vez de
seguir entrando hasta que venza su cookie.

### El caso raro que obligó a `/logout`

Si a un usuario con sesión abierta le borran la cuenta, su token sigue siendo
criptográficamente válido. El proxy lo deja pasar; los guards lo rechazan y
mandan al login; el proxy ve el token válido y devuelve al panel. Bucle
infinito.

Por eso los guards redirigen a `/logout`, que borra la cookie antes de mandar
al login. Es un archivo de veinte líneas que resuelve un bucle que solo aparece
en producción.

---

## Búsqueda: la columna `busqueda`

SQLite no sabe comparar ignorando acentos. Sin resolverlo, buscar "bateria" no
encuentra "batería" — que es exactamente como se escribe desde un celular.

La solución es una columna `Producto.busqueda` con el nombre, la marca, la
categoría, la descripción y el SKU en minúsculas y sin tildes. Se recalcula en
cada guardado con `textoDeBusqueda()`. Un `LIKE` sobre esa columna resuelve la
búsqueda con índice.

---

## Filtros en la URL, no en estado de React

El catálogo lee todo de `searchParams`: `?q=taladro&cat=herramientas&sede=central`.

Es más trabajo que un `useState`, pero: una búsqueda se puede pegar en
WhatsApp, el botón atrás funciona, y Google puede indexar cada categoría. Para
un negocio cuya conversión pasa por mandar links por WhatsApp, eso no es un
detalle técnico.

---

## Lo que quedó afuera, y por qué

| Fuera de V1 | Razón |
|---|---|
| Filtro por compatibilidad | En los rubros donde una pieza sirve para unos modelos y no otros, es la ventaja competitiva más grande, pero cargar la tabla de compatibilidad es trabajo manual pesado. Primero que tengan el catálogo cargado |
| Carrito y pago en línea | En la primera fase la conversión es WhatsApp, no checkout |
| Cuentas de cliente y favoritos | Fase 3 |
| Mapa interactivo de sedes | La página `/sedes` con la dirección escrita cumple el 90% del valor sin ninguna dependencia externa |

Agregar el filtro de compatibilidad es crear una carpeta más en
`src/features/` con sus tres archivos y una ruta de admin. Nada de lo que ya
existe se toca — para eso está la estructura por dominios.

---

## Un detalle chico con historia

`src/lib/money.ts` formatea los colones a mano en vez de usar
`Intl.NumberFormat`. Según la versión de ICU, `toLocaleString("es-CR")`
devuelve un espacio fino en lugar del punto, y el resultado salía distinto en
el servidor y en el navegador. En Costa Rica los miles van con punto: ₡32.500.
