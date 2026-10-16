import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Boton, BotonLink } from "@/components/ui/Boton";
import { Mensaje } from "@/components/ui/Mensaje";
import { EncabezadoPanel } from "@/components/ui/Panel";
import { requireUsuario } from "@/lib/guards";
import { inventario } from "@/lib/inventario";
import { UMBRAL_BAJO_POR_DEFECTO } from "@/lib/stock";
import { obtenerConfiguracion } from "@/features/configuracion/queries";
import { eliminarProducto } from "@/features/productos/actions";
import {
  listarCategoriasPlanas,
  listarMarcas,
  listarSedesConStock,
  obtenerProductoParaEditar,
} from "@/features/productos/queries";
import { FormularioProducto } from "@/features/productos/components/FormularioProducto";

export const metadata: Metadata = { title: "Editar producto" };

export default async function PaginaEditarProducto({
  params,
  searchParams,
}: PageProps<"/admin/productos/[id]">) {
  await requireUsuario();

  const { id } = await params;
  const { creado } = await searchParams;

  const producto = await obtenerProductoParaEditar(id);
  if (!producto) notFound();

  const [categorias, marcas, sedes, configuracion] = await Promise.all([
    listarCategoriasPlanas(),
    listarMarcas(),
    listarSedesConStock(),
    obtenerConfiguracion(),
  ]);

  const cantidadPorSede = new Map(
    producto.existencias.map((existencia) => [existencia.sedeId, existencia])
  );

  return (
    <>
      <EncabezadoPanel
        titulo={producto.nombre}
        descripcion={
          producto.publicado ? (
            <>
              Visible en el catálogo:{" "}
              <Link
                href={`/producto/${producto.slug}`}
                className="text-naranja hover:underline"
              >
                /producto/{producto.slug}
              </Link>
            </>
          ) : (
            "Este producto está despublicado: no aparece en el catálogo."
          )
        }
        acciones={
          <>
            <BotonLink href="/admin/productos" variante="secundario">
              Volver
            </BotonLink>
            <form action={eliminarProducto}>
              <input type="hidden" name="id" value={producto.id} />
              <Boton type="submit" variante="peligro">
                Eliminar
              </Boton>
            </form>
          </>
        }
      />

      {creado && (
        <div className="mb-5">
          <Mensaje tono="exito">
            Producto creado. Ya está en el catálogo.
          </Mensaje>
        </div>
      )}

      <FormularioProducto
        modo="editar"
        valores={{
          id: producto.id,
          nombre: producto.nombre,
          sku: producto.sku ?? "",
          descripcion: producto.descripcion,
          emoji: producto.emoji ?? "",
          categoriaId: producto.categoriaId,
          marcaId: producto.marcaId ?? "",
          precio: String(producto.precio),
          precioAnterior:
            producto.precioAnterior === null ? "" : String(producto.precioAnterior),
          mostrarPrecio:
            producto.mostrarPrecio === null
              ? ""
              : producto.mostrarPrecio
                ? "si"
                : "no",
          etiqueta: producto.etiqueta ?? "",
          publicado: producto.publicado,
          destacado: producto.destacado,
          codigoExterno: producto.codigoExterno ?? "",
        }}
        categorias={categorias.map((categoria) => ({
          id: categoria.id,
          nombre: categoria.nombre,
          grupo: categoria.padre?.nombre,
        }))}
        marcas={marcas.map((marca) => ({ id: marca.id, nombre: marca.nombre }))}
        sedes={sedes.map((sede) => ({
          id: sede.id,
          nombre: sede.nombre,
          cantidad: cantidadPorSede.get(sede.id)?.cantidad ?? 0,
          umbralBajo:
            cantidadPorSede.get(sede.id)?.umbralBajo ?? UMBRAL_BAJO_POR_DEFECTO,
        }))}
        imagenes={producto.imagenes.map((imagen) => ({
          id: imagen.id,
          url: imagen.url,
          alt: imagen.alt,
        }))}
        inventarioSoloLectura={inventario.soloLectura}
        nombreInventario={inventario.nombre}
        mostrarPreciosPorDefecto={configuracion.mostrarPreciosPorDefecto}
      />
    </>
  );
}
