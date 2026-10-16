import type { Metadata } from "next";
import Link from "next/link";
import { EncabezadoPanel, EstadoVacio } from "@/components/ui/Panel";
import { db } from "@/lib/db";
import { requireUsuario } from "@/lib/guards";
import { inventario } from "@/lib/inventario";
import { UMBRAL_BAJO_POR_DEFECTO } from "@/lib/stock";
import { listarSedesConStock } from "@/features/productos/queries";
import { MatrizExistencias } from "@/features/inventario/components/MatrizExistencias";

export const metadata: Metadata = { title: "Existencias" };

export default async function PaginaInventario({
  searchParams,
}: PageProps<"/admin/inventario">) {
  await requireUsuario();

  const sedes = await listarSedesConStock();
  if (sedes.length === 0) {
    return (
      <>
        <EncabezadoPanel titulo="Existencias" />
        <EstadoVacio titulo="Todavía no hay sedes abiertas">
          Creá al menos una sede en{" "}
          <Link href="/admin/sedes" className="text-naranja hover:underline">
            Sedes
          </Link>{" "}
          para poder cargar existencias.
        </EstadoVacio>
      </>
    );
  }

  const parametros = await searchParams;
  const slugPedido = typeof parametros.sede === "string" ? parametros.sede : "";
  const sede = sedes.find((s) => s.slug === slugPedido) ?? sedes[0];

  const [productos, existencias] = await Promise.all([
    db.producto.findMany({
      orderBy: { nombre: "asc" },
      select: {
        id: true,
        nombre: true,
        sku: true,
        categoria: { select: { nombre: true } },
      },
    }),
    inventario.porSede(sede.id),
  ]);

  const filas = productos.map((producto) => {
    const existencia = existencias.get(producto.id);
    return {
      productoId: producto.id,
      nombre: producto.nombre,
      sku: producto.sku,
      categoria: producto.categoria.nombre,
      cantidad: existencia?.cantidad ?? 0,
      umbralBajo: existencia?.umbralBajo ?? UMBRAL_BAJO_POR_DEFECTO,
    };
  });

  return (
    <>
      <EncabezadoPanel
        titulo="Existencias"
        descripcion="Ajustá las cantidades de una sede completa de una sola vez. Es lo que hay que hacer cuando llega mercadería o cierra el día."
      />

      <nav className="mb-5 flex flex-wrap gap-2">
        {sedes.map((opcion) => {
          const activa = opcion.id === sede.id;
          return (
            <Link
              key={opcion.id}
              href={`/admin/inventario?sede=${opcion.slug}`}
              className={`rounded-full border px-4 py-2 text-[0.85rem] font-semibold transition-colors ${
                activa
                  ? "border-naranja bg-naranja text-naranja-oscuro"
                  : "border-borde bg-carbon text-tenue hover:border-borde-claro hover:text-texto"
              }`}
            >
              {opcion.nombre}
            </Link>
          );
        })}
      </nav>

      {filas.length === 0 ? (
        <EstadoVacio titulo="Todavía no hay productos cargados">
          Empezá por{" "}
          <Link
            href="/admin/productos/nuevo"
            className="text-naranja hover:underline"
          >
            agregar el primero
          </Link>
          .
        </EstadoVacio>
      ) : (
        <MatrizExistencias
          key={sede.id}
          sedeId={sede.id}
          sedeNombre={sede.nombre}
          filas={filas}
          soloLectura={inventario.soloLectura}
          nombreInventario={inventario.nombre}
        />
      )}
    </>
  );
}
