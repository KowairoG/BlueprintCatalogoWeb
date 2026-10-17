import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

// Da acceso a los bindings de Cloudflare (D1/R2) durante `next dev`. Inofensivo
// para el build. PoC Fase 0 — ver docs/plan-migracion-cloudflare.md.
initOpenNextCloudflareForDev();

const enDesarrollo = process.env.NODE_ENV === "development";

/**
 * Content Security Policy.
 *
 * Se usa la variante sin nonce, que es la que recomienda la auditoría. La
 * alternativa con nonce es más estricta pero obliga a que TODAS las páginas se
 * rendericen dinámicamente: se pierde el prerenderizado y el cacheo en CDN.
 * Para este catálogo no compensa.
 *
 * `'unsafe-inline'` en scripts es el precio de esa decisión. El riesgo real es
 * bajo: en todo `src/` no hay `dangerouslySetInnerHTML`, `eval` ni `innerHTML`,
 * y React escapa todo lo que se interpola, así que no hay una superficie de XSS
 * que contener. Lo que sí aportan estas directivas es lo que no depende de eso:
 *   · frame-ancestors 'none'  → nadie puede enmarcar el panel (clickjacking)
 *   · object-src 'none'       → sin Flash/plugins embebidos
 *   · base-uri 'self'         → nadie puede reescribir la base de las URLs
 *   · form-action 'self'      → un formulario no puede postear a otro dominio
 *
 * `'unsafe-eval'` solo en desarrollo: React lo usa para reconstruir los stacks
 * de error del servidor en el navegador. En producción no hace falta.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${enDesarrollo ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  "connect-src 'self'" + (enDesarrollo ? " ws: wss:" : ""),
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(enDesarrollo ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const CABECERAS_DE_SEGURIDAD = [
  { key: "Content-Security-Policy", value: csp },
  // Redundante con frame-ancestors, pero lo entienden navegadores viejos.
  { key: "X-Frame-Options", value: "DENY" },
  // Evita que el navegador adivine el tipo de un archivo subido.
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Este sitio no usa cámara, micrófono ni ubicación: se apagan explícitamente.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
];

/**
 * Orígenes desde los que se aceptan server actions.
 *
 * Next rechaza una server action cuando el `Origin` del navegador no coincide
 * con el `Host` que ve el servidor. Es una protección contra CSRF y está bien
 * que exista, pero rompe cualquier despliegue detrás de un proxy inverso: el
 * navegador dice `https://algo.trycloudflare.com` y el servidor se cree
 * `localhost:3000`. Como TODO el panel funciona con server actions —incluido
 * el login— el síntoma es que no se puede ni entrar.
 *
 * Se llena desde .env porque la URL de un tunnel rápido cambia en cada
 * arranque:
 *
 *   ORIGENES_PERMITIDOS="algo-random.trycloudflare.com"
 *
 * Acepta varios separados por coma y comodines: "*.trycloudflare.com".
 * Vacío en desarrollo y en un despliegue normal, que es lo correcto: sin proxy
 * de por medio no hay que aflojar nada.
 */
const origenesPermitidos = (process.env.ORIGENES_PERMITIDOS ?? "")
  .split(",")
  .map((origen) => origen.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  ...(origenesPermitidos.length > 0
    ? { experimental: { serverActions: { allowedOrigins: origenesPermitidos } } }
    : {}),

  // Las fotos se sirven desde el proveedor de almacenamiento (disco local o R2
  // vía la ruta /uploads), no por el optimizador /_next/image. En Cloudflare
  // Workers ese optimizador exige Cloudflare Images habilitado en la cuenta;
  // con `unoptimized` <Image> emite la URL directa, que ya funciona en ambos
  // proveedores. (Trade-off: sin redimensionado automático.)
  images: { unoptimized: true },

  // better-sqlite3 es un módulo nativo: no se puede empaquetar, tiene que
  // cargarse desde node_modules en tiempo de ejecución.
  // `bindings` va incluido porque es lo que better-sqlite3 usa para cargar el
  // binario compilado, y hace `require("fs")` en tiempo de ejecución.
  serverExternalPackages: [
    "better-sqlite3",
    "bindings",
    "@prisma/adapter-better-sqlite3",
  ],

  async headers() {
    return [
      {
        source: "/:path*",
        headers: CABECERAS_DE_SEGURIDAD,
      },
      {
        // El panel nunca debería quedar cacheado en un equipo compartido.
        source: "/admin/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
