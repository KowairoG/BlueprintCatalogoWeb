import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { inventario } from "@/lib/inventario";

/**
 * Existencias en JSON, de solo lectura.
 *
 * Es la otra mitad del espacio reservado para integraciones: acá la tienda
 * *expone* su stock para que otro sistema lo consulte. La dirección contraria
 * —que la tienda consuma un sistema externo— se resuelve en
 * src/lib/inventario/apiExterna.ts. Ver docs/integraciones.md
 *
 *   GET /api/v1/existencias              todas las sedes
 *   GET /api/v1/existencias?sede=central   una sede
 *   GET /api/v1/existencias?sku=ABC-001    un producto
 *
 * Se publica el estado (en stock / últimas unidades / agotado), no la cantidad
 * exacta: cuánto inventario tiene el local es información de negocio.
 */

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const parametros = request.nextUrl.searchParams;
  const sedePedida = parametros.get("sede");
  const skuPedido = parametros.get("sku");

  const productos = await db.producto.findMany({
    where: {
      publicado: true,
      ...(skuPedido ? { sku: skuPedido.toUpperCase() } : {}),
    },
    select: { id: true, sku: true, nombre: true, slug: true },
    orderBy: { nombre: "asc" },
  });

  const porProducto = await inventario.porProductos(productos.map((p) => p.id));

  return NextResponse.json(
    {
      version: 1,
      origen: inventario.nombre,
      generado: new Date().toISOString(),
      productos: productos.map((producto) => {
        const existencias = porProducto.get(producto.id) ?? [];
        const filtradas = sedePedida
          ? existencias.filter((e) => e.sedeSlug === sedePedida)
          : existencias;

        return {
          sku: producto.sku,
          nombre: producto.nombre,
          slug: producto.slug,
          sedes: filtradas.map((existencia) => ({
            sede: existencia.sedeSlug,
            nombre: existencia.sedeNombre,
            estado: existencia.estado,
            disponible: existencia.cantidad > 0,
            actualizado: existencia.actualizadoEn?.toISOString() ?? null,
          })),
        };
      }),
    },
    { headers: { "Cache-Control": "public, max-age=30" } }
  );
}
