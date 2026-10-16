import { NextResponse, type NextRequest } from "next/server";
import { MONEDA } from "@/lib/money";
import { resolverPrecio } from "@/lib/precio";
import { obtenerConfiguracion } from "@/features/configuracion/queries";
import { buscarProductos } from "@/features/productos/queries";

/**
 * Catálogo público en JSON, de solo lectura.
 *
 * Sirve para que un sistema externo (el punto de venta, una app, un bot de
 * WhatsApp) consulte el catálogo sin scrapear el HTML.
 *
 * Respeta la visibilidad de precios: si un precio está oculto en el sitio,
 * tampoco viaja acá. La regla vive en un solo lugar (`resolverPrecio`), así
 * que no puede desincronizarse con lo que se ve en pantalla.
 */

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const parametros = request.nextUrl.searchParams;
  const configuracion = await obtenerConfiguracion();

  const productos = await buscarProductos(
    {
      texto: parametros.get("q") ?? undefined,
      categoriaSlug: parametros.get("categoria") ?? undefined,
      sedeSlug: parametros.get("sede") ?? undefined,
      marcaSlug: parametros.get("marca") ?? undefined,
    },
    { permiteOrdenarPorPrecio: configuracion.mostrarPreciosPorDefecto }
  );

  return NextResponse.json(
    {
      version: 1,
      total: productos.length,
      preciosPublicos: configuracion.mostrarPreciosPorDefecto,
      productos: productos.map((producto) => {
        const precio = resolverPrecio(
          producto,
          configuracion.mostrarPreciosPorDefecto
        );

        return {
          sku: producto.sku,
          nombre: producto.nombre,
          slug: producto.slug,
          descripcion: producto.descripcion,
          categoria: producto.categoria.slug,
          marca: producto.marca?.slug ?? null,
          etiqueta: producto.etiqueta,
          // Cuando el precio está oculto, la clave sencillamente no existe.
          ...(precio.visible
            ? {
                precio: precio.precio,
                precioAnterior: precio.precioAnterior,
                moneda: MONEDA.codigo,
              }
            : {}),
          existencias: producto.existencias.map((existencia) => ({
            sede: existencia.sedeSlug,
            estado: existencia.estado,
            // La cantidad exacta es información de negocio: se publica el
            // estado, no el número.
          })),
        };
      }),
    },
    { headers: { "Cache-Control": "public, max-age=60" } }
  );
}
