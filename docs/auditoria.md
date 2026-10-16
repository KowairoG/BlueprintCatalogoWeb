# Auditoría

Revisión de **estructura, seguridad y reutilización** del código. Se hizo sobre
la primera implementación real del sistema; las conclusiones valen para la
plantilla, que salió de ahí.

- **Fecha:** 9 de agosto de 2026
- **Método:** lectura de código (no se ejecutó la app ni se hicieron pruebas de penetración).
- **Veredicto corto:** base sólida y arquitectura madura. La seguridad está bien
  encaminada; quedan 4 endurecimientos antes de exponer el panel a internet,
  ninguno crítico. Para llevar el proyecto a otro negocio se elige el camino de
  **reskin/fork por negocio** (ver sección 3).

> **Estado (9-ago-2026, mismo día):** aplicados S1, S2, S3, S4, R1 y R2, cada uno
> verificado corriendo la aplicación. R3 queda fuera por decisión (ver sección 3).
> Aplicar S4 destapó además un defecto que la revisión por lectura no había
> visto — está anotado abajo como **B1**. Detalle de la implementación al final,
> en *Qué se aplicó*.

---

## Resumen de hallazgos

| # | Área | Hallazgo | Severidad | Estado |
|---|---|---|---|---|
| S1 | Seguridad | Login sin límite de intentos (rate-limit) | Media | ✅ aplicado |
| S2 | Seguridad | El secreto de ejemplo pasa la validación; admin por defecto público | Media-alta | ✅ aplicado |
| S3 | Seguridad | Sin cabeceras de seguridad (CSP, X-Frame-Options) | Baja-media | ✅ aplicado |
| S4 | Seguridad | El upload valida el MIME declarado, no el contenido real | Baja | ✅ aplicado |
| B1 | Corrección | Producto creado y publicado aunque la acción reporte error | Media | ✅ corregido |
| R1 | Reutilización | Identidad de marca a medio externalizar (textos quemados) | — | ✅ aplicado |
| R2 | Reutilización | Moneda fija en colones | — | ✅ aplicado |
| R3 | Reutilización | Mono-negocio (una sola fila de configuración) | — | ⏸ fuera de alcance |

Los ítems de reutilización no son defectos: son el trabajo esperado para clonar
el sistema a otro negocio.

**B1 — Producto fantasma (hallado al verificar S4).** `crearProducto` guardaba
el producto y *después* procesaba las imágenes. Con una imagen inválida, el
usuario veía "Ese archivo no es una imagen válida" pero el producto ya había
quedado creado **y publicado en el catálogo**; al reintentar, generaba un
duplicado. Lo mismo aplicaba a un archivo que superara los 5 MB, así que el
defecto existía desde antes de S4: lo que hizo S4 fue volverlo fácil de
disparar. Corregido invirtiendo el orden — las imágenes se validan y suben
primero, y recién entonces se escribe en la base.

---

## 1. Estructura

Organización por dominio de negocio (`features/productos`, `categorias`, `sedes`,
`marcas`, `inventario`, `usuarios`, `configuracion`, `auth`, `catalogo`), cada uno
con el mismo patrón interno: `schemas · queries · actions · components`. Las reglas
transversales viven aisladas en `lib/`.

Lo más valioso del diseño: **todo lo que puede cambiar está detrás de una interfaz.**

- `lib/inventario/` — el stock se lee por contrato (`InventarioProvider`), nunca
  consultando la tabla `existencias` directamente. Cambiar a un sistema de
  facturación externo = una implementación nueva (`apiExterna.ts`, ya reservada) y
  una variable de entorno.
- `lib/storage/` — misma idea para imágenes: disco local hoy, R2/Supabase mañana,
  sin tocar el formulario de productos.
- `lib/precio.ts` y `lib/stock.ts` — fuente única de verdad. Ninguna pantalla lee
  `producto.precio` ni deriva el estado de stock por su cuenta.

**Conclusión:** la arquitectura no necesita cambios. Es más madura que la de la
mayoría de proyectos de este tamaño. Agregar una funcionalidad es crear una carpeta
en `features/` sin tocar lo existente.

---

## 2. Seguridad

### Lo que está bien hecho

Verificado en el código, no asumido:

- **Sesión** JWT (HS256) en cookie `httpOnly`, `secure` en producción, `sameSite=lax`,
  vencimiento de 7 días. `SESSION_SECRET` con largo mínimo forzado.
- **Autorización real en `guards.ts`**: re-consulta la base de datos en cada request,
  así que desactivar o borrar un usuario lo saca de inmediato aunque su token siga
  firmado. `proxy.ts` solo hace un chequeo optimista para redirigir rápido; la barrera
  que cuenta es `guards.ts`.
- **Toda server action valida sesión** (`requireUsuarioEnAccion` / `requireAdminEnAccion`).
  Esto es clave: una server action es un endpoint POST real, invocable sin pasar por la
  interfaz del panel.
- **Gestión de usuarios solo ADMIN**, con protección de "último administrador" y
  anti-auto-bloqueo (un admin no puede quitarse el rol ni desactivarse si es el único).
- **Login endurecido**: comparación contra un hash señuelo cuando el correo no existe
  (evita enumeración de usuarios por tiempo de respuesta), mensaje de error genérico,
  bcrypt con costo 12.
- **Anti open-redirect** en login y logout (solo se aceptan destinos internos).
- **Anti path-traversal** en el borrado de archivos (`storage/localDisk.ts` normaliza
  la ruta y verifica que caiga dentro de `public/uploads`).
- **Sin fuga de datos de negocio** en la API pública: los precios ocultos no viajan
  (todo pasa por `resolverPrecio`) y se publica el *estado* de stock, nunca la cantidad
  exacta.
- **Dinero como enteros** (colones sin decimales ni floats).
- **Sin `dangerouslySetInnerHTML`, `eval` ni `innerHTML`** en todo `src/`. Prisma
  parametriza las consultas (sin inyección SQL). Los links de WhatsApp usan
  `encodeURIComponent`.

### Pendientes de endurecer

Ninguno es crítico. Todos aplican antes de exponer `/admin` a internet.

| # | Qué | Por qué | Cómo | Archivo |
|---|---|---|---|---|
| S1 | **Login sin rate-limit** | No hay throttle ni bloqueo por intentos fallidos. bcrypt-12 ralentiza un ataque de fuerza bruta pero no lo impide. | Límite por IP y/o por cuenta (p. ej. ventana deslizante), o captcha tras N fallos. | `features/auth/actions.ts` |
| S2 | **El secreto de ejemplo pasa la validación** | El placeholder de `SESSION_SECRET` mide 40 caracteres y supera el mínimo de 32, así que la validación de largo da falsa confianza. El admin por defecto (`admin@tienda.local` / `tienda2026`) está publicado en el README. | Guarda que **rechace arrancar en producción** con el secreto de ejemplo o con el admin/password por defecto. | `lib/session.ts`, `prisma/seed.ts` |
| S3 | **Sin cabeceras de seguridad** | No hay CSP ni X-Frame-Options; el panel es enmarcable (clickjacking) y una XSS eventual no tendría contención. | Agregar `headers()` en `next.config` con CSP y `X-Frame-Options: DENY` para `/admin`. | `next.config.ts` |
| S4 | **Upload valida MIME declarado, no contenido** | Se confía en `archivo.type` (lo manda el cliente). Riesgo bajo porque se fuerza extensión de imagen y se sirve como estático, pero es endurecible. | Validar *magic bytes* del archivo; opcionalmente re-codificar la imagen para limpiar metadatos. | `lib/storage/tipos.ts`, `lib/storage/localDisk.ts` |

**Orden sugerido:** S2 y S1 antes de publicar; S3 y S4 después.

---

## 3. Reutilización para otro negocio

### Qué tan atado está a un negocio concreto

**A favor (mucho):** el modelo de datos usa nombres genéricos (productos, categorías,
marcas, sedes, existencias) y los datos del negocio ya están externalizados en la tabla
`Configuracion` (nombre, eslogan, teléfono, WhatsApp, horario, redes, política de
precios). La arquitectura sirve tal cual para cualquier catálogo con inventario por
sede.

**Lo que todavía ataba al negocio (poco, pero existía):**

- **R1 — Identidad de marca a medio externalizar.** `Configuracion` guardaba los datos,
  pero varios componentes de presentación todavía tenían el nombre, el rubro y la
  ubicación **escritos a mano**, sin leerlos de `Configuracion`:
  - `src/app/layout.tsx` — título y descripción de SEO.
  - `src/app/admin/layout.tsx` — logo del panel.
  - `src/app/login/page.tsx` — encabezado del login.
  - `src/features/catalogo/components/Cabecera.tsx` — logo del sitio.
  - `src/features/catalogo/components/PieDePagina.tsx` — pie con nombre y ubicación.
  - Además, los `@default` del modelo `Configuracion` en `prisma/schema.prisma`
    traían los valores del negocio quemados.
- **R2 — Moneda fija en colones.** `lib/money.ts` asume el símbolo `₡`, separador de
  miles con punto y enteros CRC.
- **R3 — Mono-negocio.** Una sola fila de configuración (`id="unica"`); no hay
  separación por inquilino.

### Camino elegido: reskin / fork por negocio

**Decisión (9-ago-2026):** por ahora, clonar el proyecto por cada negocio. Es rápido,
sin complejidad de multi-tenancy, y suficiente para un puñado de clientes. Si el modelo
funciona comercialmente, se evalúa migrar a multi-tenant de verdad.

**El refactor que hace el fork trivial** (hacerlo una vez, beneficia a todos los forks):
mover la identidad de marca de los textos quemados y de los `@default` del schema hacia
lecturas de `Configuracion`. Después de eso, clonar un negocio es casi solo datos y
paleta.

**Checklist para clonar a un negocio nuevo** (actualizado tras aplicar R1 y R2 —
los pasos 2 y 3 originales ya no hacen falta):

1. Copiar el repo (o `git clone` a un proyecto nuevo).
2. Reemplazar la constante `NEGOCIO` y los datos (sedes, categorías, marcas,
   productos) en `prisma/datos-iniciales.ts`.
3. `.env` propio: nuevo `SESSION_SECRET`, admin propio, `DATABASE_URL`.
4. `npm run setup` — migra, genera el cliente y carga todo.
5. Si el negocio usa otra moneda, cambiar la constante `MONEDA` en
   `lib/money.ts`. Es lo único que conoce el símbolo.
6. Reskin visual: paleta en `src/app/globals.css`.
7. Ajustar la copia específica del rubro: el titular de la portada en
   `src/app/(publico)/page.tsx` y las cuatro promesas del pie en
   `PieDePagina.tsx`. Es lo único con texto de venta escrito en el código.

Los pasos 2 a 6 son datos y configuración. El 7 es el único que toca componentes,
y son dos archivos.

### Si crece: multi-tenant de verdad

Proyecto aparte, no un ajuste. Implicaría: un modelo `Negocio`/`Tenant`, **todas** las
consultas con `where tenantId`, routing por subdominio, y tema + moneda por inquilino.
El código actual está bien encaminado para este salto (la config ya está aislada), pero
es un rediseño de la capa de datos, no un retoque.

---

## Qué se aplicó

Todo verificado corriendo la aplicación, no solo compilando.

### S1 · Límite de intentos — `lib/rateLimit.ts`, `features/auth/actions.ts`

Ventana deslizante con dos reglas en paralelo: **5 fallos por cuenta** (bloqueo
de 15 min) y **20 por IP** (bloqueo de 30 min). La regla por cuenta frena el
ataque dirigido a un correo; la de IP frena el barrido de muchos correos desde
el mismo origen, que la primera no vería.

Tres detalles que importan:

- El límite se consulta **antes** de tocar la base y antes de correr bcrypt: un
  login bloqueado no debe costarle trabajo al servidor.
- Solo se cuentan los fallos. Al entrar bien, el contador se borra: quien
  simplemente olvidó su contraseña no arrastra penalización.
- A partir del tercer fallo el mensaje avisa cuántos intentos quedan. No le da
  nada útil a un atacante —ya sabe que hay un límite— y le evita el bloqueo a
  quien está tecleando mal.

**Limitación conocida y documentada:** el contador vive en la memoria del
proceso. Se reinicia con el servidor y no se comparte entre instancias. Para el
escenario de `docs/despliegue.md` (un VPS) alcanza y es gratis. Si algún día
corre en varias instancias hay que moverlo a Redis o a una tabla; la interfaz
de `registrarFallo` / `estadoDeLimite` no cambia, solo su implementación.

*Verificado:* seis envíos reales del formulario → los avisos de intentos
restantes aparecen en orden y el séptimo responde "Demasiados intentos
fallidos. Probá de nuevo en 15 minutos."

### S2 · Valores de ejemplo — `lib/entorno.ts`, `lib/session.ts`, `prisma/seed.ts`

En desarrollo avisa por consola; **en producción corta el arranque**. Es
preferible un despliegue que falla con un mensaje claro a un panel abierto al
mundo con la contraseña que sale en el README.

Cubre los dos casos que la validación de largo no podía ver: el `SESSION_SECRET`
de ejemplo (que mide más de 32 caracteres pero es público) y el par
`admin@tienda.local` / `tienda2026`.

*Verificado:* el seed en desarrollo imprime la advertencia y sigue.

### S3 · Cabeceras — `next.config.ts`

Se usó la variante **sin nonce**, que es la que recomendaba esta auditoría. La
alternativa con nonce es más estricta pero obliga a renderizar todas las
páginas dinámicamente: se pierde el prerenderizado y el cacheo en CDN. Para
este catálogo no compensa.

`'unsafe-inline'` en scripts es el precio de esa decisión, y el riesgo real es
bajo: no hay `dangerouslySetInnerHTML`, `eval` ni `innerHTML` en todo `src/`, y
React escapa lo que se interpola. Lo que sí aportan las directivas es lo que no
depende de eso: `frame-ancestors 'none'` (clickjacking), `object-src 'none'`,
`base-uri 'self'` y `form-action 'self'`.

Se agregaron además `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
`Referrer-Policy`, `Permissions-Policy` y `Cache-Control: no-store` en
`/admin/*`, para que el panel no quede cacheado en un equipo compartido.

*Verificado:* las cabeceras salen en la respuesta y el sitio funciona sin
ninguna violación de CSP en consola.

### S4 · Contenido real de las imágenes — `lib/storage/tipos.ts`, `localDisk.ts`

Se dejó de confiar en `File.type` —lo manda el cliente— y se valida la firma
del archivo ("magic bytes"). La extensión guardada se deriva del tipo detectado,
y el nombre se genera entero: nada de lo que mandó el cliente llega al sistema
de archivos.

Importa porque los archivos se sirven desde el mismo dominio: un HTML servido
como imagen habría sido una vía de XSS.

*Verificado:* un HTML con nombre `.png` y `type: image/png` es rechazado; un
JPEG real declarado como `text/plain` es aceptado por su contenido.

### R1 · Identidad de marca — `Configuracion` + `components/ui/Logo.tsx`

Cinco campos nuevos (`nombreCorto`, `rubro`, `logoEmoji`, `ubicacion`,
`descripcionSeo`), los `@default` del schema pasaron a ser **genéricos**, y los
valores del negocio se mudaron a `prisma/datos-iniciales.ts` bajo la constante
`NEGOCIO`.

Esa separación es el punto: el schema describe el producto de software, los
datos de un negocio concreto entran por el seed. Los cinco componentes que
tenían el nombre escrito a mano ahora leen de `Configuracion`, y el logo se
dibuja en un solo lugar (`Logo.tsx`) en vez de estar repetido en tres.

El seed rellena los campos que sigan vacíos o con el valor genérico, pero no
pisa lo que ya se haya personalizado desde el panel.

*Verificado:* cambiando una fila de la base, el sitio entero pasó a ser
"Ferretería La Esquina" — título, logo, pie y login — sin tocar una línea de
código. Restaurado después.

**Agregado después:** un campo `logoUrl` con subida desde
`/admin/configuracion`, para que la marca sea el archivo real y no un emoji. El
emoji queda como respaldo, así el sitio nunca se ve roto por una imagen que
falta. Al reemplazar o quitar el logo se borra el archivo anterior del
almacenamiento. Usa la misma capa de storage, así que hereda la validación por
contenido de S4.

### R2 · Moneda — `lib/money.ts`

Una constante `MONEDA` (código ISO, símbolo, posición, separadores, decimales)
concentra todo. Nada más en el código conoce el símbolo. Si el negocio usa una
moneda con céntimos, se pone `decimales: 2` y se siguen guardando enteros
—centavos— en la base, que es lo que mantiene la regla de no usar floats.

Después de la auditoría se cerraron los dos cabos que quedaban: el alias
`colones` pasó a llamarse `monto` —tenía el nombre de la moneda, así que
cambiar `MONEDA` obligaba a renombrarlo en todo el código— y el idioma salió a
`lib/region.ts` bajo la constante `LOCALE`, que es lo que leen el `lang` del
documento y las fechas del panel. Moneda e idioma son decisiones separadas:
hay países que comparten idioma y no moneda.

### B1 · Producto fantasma — `features/productos/actions.ts`

Las imágenes se validan y suben **antes** de escribir en la base. Si alguna
falla, no se crea ni se modifica nada. Si la escritura en base falla después de
subir, se borran los archivos ya subidos para no dejarlos huérfanos.

*Verificado:* con una imagen inválida el producto ya no se crea (`total: 0` en
la API); con una imagen válida se crea y la foto queda guardada; tras borrar el
producto, `public/uploads` queda sin archivos huérfanos.

### Lo que quedó a propósito

- **Copia específica del rubro.** Las promesas del pie, la lista de servicios y
  el placeholder del buscador siguen escritos en el código. Son texto de venta,
  no identidad de marca: meterlos en la base cambiaría un formulario de
  configuración por un editor de contenidos, que es otro proyecto. Están
  marcados en el código con `COPY A MEDIDA DEL CLIENTE` y anotados como paso
  del checklist de clonado.

  > **Después de la auditoría** se cerró el caso del titular de la portada, que
  > sí estaba quemado con una frase del rubro: ahora sale del eslogan de
  > `Configuracion`, con una línea genérica de respaldo. Y el vocabulario de la
  > interfaz se volvió neutral —"producto" en vez del nombre de la mercadería—,
  > que sirve para cualquier rubro.
- **Ejemplos en los formularios del panel** (los `placeholder` y `ayuda` de
  `FormularioConfiguracion.tsx`, que traen una ciudad y un nombre de muestra).
  Son ayudas de contexto, no marca. Cambiarlas es cosmético y se hace al clonar.
- **R3, multi-tenant.** Decisión explícita de esta auditoría: fork por negocio.

Se corrigió sí un caso que no era marca sino dato viejo: la descripción SEO de
`/sedes` listaba los nombres de las sedes a mano y se habría quedado
desactualizada al abrir o cerrar un local. Ahora se arma con las sedes reales.

---

## Apéndice — archivos revisados

`lib/session.ts`, `lib/guards.ts`, `proxy.ts`, `lib/acciones.ts`, `lib/db.ts`,
`features/auth/*` (actions, password, schemas), `app/logout/route.ts`,
`app/api/v1/*` (productos, existencias), `lib/storage/*`,
`features/productos/actions.ts`, `features/usuarios/actions.ts`,
`features/configuracion/actions.ts`, `features/inventario/actions.ts`,
`lib/precio.ts`, `lib/stock.ts`, `lib/money.ts`, `lib/whatsapp.ts`,
`lib/constantes.ts`, `lib/inventario/*`, `.env.example`, `prisma.config.ts`,
`next.config.ts`, `prisma/schema.prisma`, `prisma/seed.ts`.
