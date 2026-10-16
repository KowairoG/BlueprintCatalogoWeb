# Publicar el sitio

El objetivo es que el cliente no pague hosting. Estas son las opciones ordenadas de
más barata a más flexible.

---

## Antes de publicar: la lista corta

Los dos primeros puntos no son sugerencias: **la aplicación se niega a arrancar
en producción** si siguen sin hacerse.

1. **Generar un `SESSION_SECRET` propio.** El del ejemplo es público, y con él
   cualquiera podría falsificar una sesión del panel:

   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
   ```

2. **Poner `ADMIN_EMAIL` y `ADMIN_PASSWORD` propios** en el `.env` antes de
   correr el seed. Los del ejemplo están en el README.
3. **Revisar `/admin/configuracion`**: nombre, logo, teléfono, WhatsApp y si se
   publican los precios.
4. **Nunca subir el archivo `.env` a git.** Ya está en `.gitignore`.

Si el sitio va detrás de Caddy o Nginx, asegurate de que reenvíen la cabecera
`X-Forwarded-For`. El límite de intentos del login la usa para contar por IP; sin
ella el límite pasa a ser global (más restrictivo, no menos, así que falla del
lado seguro, pero un solo atacante podría dejar a todos bloqueados). Caddy la
manda sola; en Nginx es `proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;`.

---

## Opción A · Vercel + Turso (recomendada, $0)

Vercel sirve el sitio y Turso guarda la base. Ambos tienen plan gratuito
permanente y Turso habla SQLite, así que el schema no cambia.

### 1. Base de datos en Turso

```bash
npm install -g @turso/cli
turso auth signup
turso db create tienda
turso db show tienda --url
turso db tokens create tienda
```

### 2. Cambiar el adaptador

Turso usa libSQL en vez de un archivo local:

```bash
npm install @prisma/adapter-libsql
npm uninstall @prisma/adapter-better-sqlite3 better-sqlite3
```

En `src/lib/db.ts`, reemplazar el adaptador:

```ts
import { PrismaLibSQL } from "@prisma/adapter-libsql";

const adapter = new PrismaLibSQL({
  url: process.env.DATABASE_URL!,
  authToken: process.env.DATABASE_AUTH_TOKEN,
});
```

En `next.config.ts`, cambiar `serverExternalPackages` por `["@libsql/client"]`.

El resto del código no se toca: por eso el cliente de Prisma está aislado en un
solo archivo.

### 3. Imágenes

Vercel tiene disco efímero: las fotos subidas desaparecen en cada despliegue.
Hay que migrar el almacenamiento a Cloudflare R2 (10 GB gratis) o Supabase
Storage (1 GB gratis). El cómo está en [integraciones.md](integraciones.md).

**Si no quieren lidiar con esto ahora**, la opción B evita el problema entero.

### 4. Desplegar

```bash
npm install -g vercel
vercel
```

Variables de entorno a cargar en el panel de Vercel:

| Variable | Valor |
|---|---|
| `DATABASE_URL` | la URL `libsql://…` de Turso |
| `DATABASE_AUTH_TOKEN` | el token de Turso |
| `SESSION_SECRET` | la clave generada arriba |
| `INVENTARIO_PROVIDER` | `prisma` |
| `STORAGE_PROVIDER` | `r2` (o `local` si todavía no migraron) |

Después del primer despliegue, cargar los datos iniciales apuntando a la base
de producción:

```bash
DATABASE_URL="libsql://..." DATABASE_AUTH_TOKEN="..." npm run db:seed
```

---

## Opción B · Un VPS de ~$4/mes (más simple de mantener)

Un servidor chico de Hetzner, DigitalOcean o Contabo. **No hay que cambiar
nada del código**: SQLite y las imágenes en disco funcionan tal cual.

```bash
git clone <el-repo> && cd <la-carpeta-del-cliente>
npm ci
cp .env.example .env   # editar con los valores reales
npm run setup
npm run build
npm start
```

Para que sobreviva a los reinicios:

```bash
npm install -g pm2
pm2 start npm --name tienda -- start
pm2 startup && pm2 save
```

Poner Caddy o Nginx adelante para el HTTPS. Con Caddy son dos líneas:

```
tudominio.com {
  reverse_proxy localhost:3000
}
```

### Copias de seguridad

Toda la base es un archivo. Copiarlo es todo el respaldo:

```bash
sqlite3 prisma/tienda.db ".backup respaldo-$(date +%F).db"
```

Agendarlo con `cron` una vez al día y guardarlo fuera del servidor.

---

## Cuál elegir

| | Vercel + Turso | VPS |
|---|---|---|
| Costo | $0 | ~$4/mes |
| Cambios en el código | adaptador + storage | ninguno |
| Mantenimiento | ninguno | actualizar el servidor |
| Respaldos | los hace Turso | hay que agendarlos |
| Imágenes | requiere R2/Supabase | funcionan solas |

**Recomendación:** empezar con el VPS. Cuesta menos que un almuerzo al mes,
no requiere tocar nada y evita el problema de las imágenes. Migrar a Vercel
después es cuestión de horas si el tráfico lo justifica.
