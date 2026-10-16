# Demo por Cloudflare Tunnel

Cómo poner el sitio en una URL pública en diez minutos, sin servidor, para
mostrárselo al cliente.

La aplicación corre en tu máquina y `cloudflared` abre un túnel hacia
Cloudflare. Tu router no se toca: la conexión sale desde tu PC, no entra. Como
todo corre local, SQLite y las imágenes de `public/uploads` funcionan tal cual,
sin migrar nada.

> **Esto es una demo, no producción.** El túnel rápido genera una URL aleatoria
> que cambia en cada arranque, tiene tope de 200 peticiones simultáneas y
> Cloudflare lo declara para pruebas. Para producción de verdad está el *named
> tunnel*, al final de este documento.

---

## Antes de exponer nada

Tres cosas, en este orden. La primera no es opcional.

### 1. Cambiar la contraseña del administrador

La base se creó con `admin@tienda.local` / `tienda2026`, credenciales que estaban
publicadas en el README. En cuanto el sitio esté en internet, cualquiera que las
conozca entra al panel.

```bash
npm run admin:password
```

Pide correo y contraseña nuevos, no muestra lo que escribís y actualiza el
usuario directamente en la base. Después actualizá también `ADMIN_EMAIL` y
`ADMIN_PASSWORD` en el `.env`, para que un `npm run db:seed` futuro no vuelva a
crear el de ejemplo.

### 2. Confirmar el `SESSION_SECRET`

Tiene que ser una clave propia, no la de `.env.example`. Si todavía es la de
ejemplo, la aplicación directamente **no arranca** en modo producción. Para
generar una:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Y pegarla en `.env` como `SESSION_SECRET="..."`.

### 3. Instalar cloudflared

```powershell
winget install Cloudflare.cloudflared
```

Verificá que quedó: `cloudflared --version`

---

## Levantar la demo

Son dos terminales. Dejá las dos abiertas mientras dure la demo.

### Terminal 1 — la aplicación

```bash
npm run build
npm start
```

Queda sirviendo en `http://localhost:3000`. El `build` tarda un poco la primera
vez; después arranca en segundos.

### Terminal 2 — el túnel

```bash
cloudflared tunnel --url http://localhost:3000
```

A los pocos segundos imprime un recuadro con la URL, algo así:

```
+--------------------------------------------------------------------------+
|  Your quick Tunnel has been created! Visit it at:                        |
|  https://algo-random-aqui.trycloudflare.com                              |
+--------------------------------------------------------------------------+
```

Esa es la dirección que le mandás al cliente.

### Paso obligatorio: registrar el origen

**El panel no va a funcionar hasta que hagas esto.** Next rechaza las *server
actions* cuando el origen del navegador no coincide con el host del servidor —
es una protección contra CSRF que se activa sola detrás de un proxy. Como el
login y todo el panel funcionan con server actions, el síntoma es que no podés
ni entrar, con un error tipo `Invalid Server Actions request`.

Copiá el host que te dio el túnel (sin `https://`) al `.env`:

```env
ORIGENES_PERMITIDOS="algo-random-aqui.trycloudflare.com"
```

Y **reiniciá la Terminal 1** (`Ctrl+C` y `npm start` de nuevo). No hace falta
recompilar.

Como la URL cambia en cada arranque del túnel, tenés que repetir esto cada vez.
Si te cansa, podés dejarlo fijo con un comodín:

```env
ORIGENES_PERMITIDOS="*.trycloudflare.com"
```

Es menos estricto —acepta cualquier subdominio de trycloudflare— pero para una
demo temporal es un canje razonable y te ahorra el reinicio.

---

## Verificar antes de mandar el link

Abrí la URL del túnel desde el celular, con los datos móviles y **no** por
WiFi: así probás que sale de verdad a internet y no estás viendo tu propia red.

- [ ] Carga la portada con los productos
- [ ] El buscador devuelve resultados
- [ ] Se ve el detalle de un producto
- [ ] La página de sedes muestra las existencias
- [ ] `/login` entra con las credenciales nuevas
- [ ] Desde el panel se puede guardar una cantidad en `/admin/inventario`

Ese último es el que confirma que las server actions están pasando. Si falla,
te faltó el `ORIGENES_PERMITIDOS` o el reinicio.

---

## Bajar la demo

`Ctrl+C` en las dos terminales. La URL muere con el túnel y deja de ser
accesible al instante.

Conviene levantarlo solo mientras se lo mostrás. No porque haya un riesgo
inminente, sino porque la aplicación corre con tu usuario de Windows y no
dentro de una máquina desechable: menos horas expuesto, menos superficie.

---

## Qué está expuesto y qué no

**No se expone:** tus archivos, carpetas compartidas, escritorio remoto ni
ningún otro servicio de la máquina. `cloudflared` publica exactamente el puerto
que le indicaste y nada más. Tu IP de casa tampoco queda a la vista: el tráfico
sale por Cloudflare.

**Sí se expone:** la aplicación. Concretamente `/login`, que es el punto que
alguien intentaría forzar. Está razonablemente cubierto —límite de intentos con
bloqueo por ventana deslizante, y bcrypt con costo 12 que hace lento cada
intento— pero eso protege contra fuerza bruta, no contra una contraseña que
estaba publicada. De ahí el paso 1.

**La URL no es secreta.** Es aleatoria, pero cualquiera a quien se la reenvíen
puede entrar, y hay bots que barren subdominios de `trycloudflare.com`. Tratala
como pública.

**El ruido de bots es normal.** Vas a ver intentos a `/wp-admin`, `/.env` y
compañía en el log. Next no sirve esos archivos; son fondo de internet, no un
ataque dirigido.

---

## Después: named tunnel con dominio propio

Cuando el cliente diga que sí y compres el dominio, el salto natural es un *named
tunnel*: URL estable, tu propio dominio, corre como servicio de Windows (aguanta
reinicios) y sí es un uso legítimo de producción según Cloudflare.

A grandes rasgos:

1. Crear cuenta gratis en Cloudflare y agregar el dominio (cambiar los
   nameservers donde lo compraste).
2. `cloudflared tunnel login`
3. `cloudflared tunnel create tienda`
4. `cloudflared tunnel route dns tienda www.tudominio.com`
5. Configurar `config.yml` apuntando a `http://localhost:3000`
6. `cloudflared service install`

Y ahí `ORIGENES_PERMITIDOS` pasa a ser tu dominio fijo, así que el problema de
reiniciar en cada arranque desaparece.

**Una cosa que vale mucho la pena en ese momento:** Cloudflare Zero Trust
incluye **Access** gratis hasta 50 usuarios. Poniéndolo delante de `/admin`, el
panel exige autenticación por correo *antes* de que el tráfico llegue a tu
aplicación. El catálogo queda público y el panel deja de estar en internet.

Nada de esto hace falta hoy.
