import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * Sirve las imágenes guardadas en R2 bajo `/uploads/<clave>`.
 *
 * Solo actúa cuando STORAGE_PROVIDER=r2 (en disco local las imágenes son
 * archivos estáticos de `public/uploads` y las sirve el handler estático). Así
 * la URL guardada en `ProductoImagen.url` es la misma en ambos proveedores.
 * Ver docs/plan-migracion-cloudflare.md (Fase 1).
 */

export const dynamic = "force-dynamic";

type R2ObjectLike = {
  body: ReadableStream;
  httpMetadata?: { contentType?: string };
} | null;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ clave: string[] }> }
) {
  if ((process.env.STORAGE_PROVIDER ?? "local").toLowerCase() !== "r2") {
    return new Response("No encontrado", { status: 404 });
  }

  const { clave } = await params;
  const key = clave.join("/");

  const { env } = getCloudflareContext();
  const fotos = (env as unknown as {
    FOTOS?: { get(k: string): Promise<R2ObjectLike> };
  }).FOTOS;
  if (!fotos) {
    return new Response("Almacenamiento no disponible", { status: 500 });
  }

  const obj = await fotos.get(key);
  if (!obj) {
    return new Response("No encontrado", { status: 404 });
  }

  return new Response(obj.body, {
    headers: {
      "Content-Type": obj.httpMetadata?.contentType ?? "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
