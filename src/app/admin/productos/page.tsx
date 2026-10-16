import type { Metadata } from "next";
import Link from "next/link";
import { Boton, BotonLink } from "@/components/ui/Boton";
import { EncabezadoPanel, EstadoVacio, Insignia } from "@/components/ui/Panel";
import { TEXTO_ESTADO_STOCK } from "@/lib/constantes";
import { requireUsuario } from "@/lib/guards";
import { monto } from "@/lib/money";
import { resolverPrecio, TEXTO_PRECIO_OCULTO } from "@/lib/precio";
import { CLASE_ESTADO, totalUnidades } from "@/lib/stock";
import { obtenerConfiguracion } from "@/features/configuracion/queries";
import { alternarPublicado } from "@/features/productos/actions";
import {
  listarCategoriasPlanas,
  listarProductosAdmin,
  type FiltrosAdmin,
} from "@/features/productos/queries";

export const metadata: Metadata = { title: "Productos" };

const ESTADOS = [
  { valor: "todos", texto: "Todos" },
  { valor: "publicados", texto: "Publicados" },
  { valor: "borradores", texto: "Despublicados" },
  { valor: "agotados", texto: "Agotados en todas las sedes" },
] as const;

function texto(valor: string | string[] | undefined): string {
  return typeof valor === "string" ? valor : "";
}

export default async function PaginaProductos({
  searchParams,
}: PageProps<"/admin/productos">) {
  await requireUsuario();

  const parametros = await searchParams;
  const filtros: FiltrosAdmin = {
    texto: texto(parametros.q),
    categoriaId: texto(parametros.categoria) || undefined,
    estado: (ESTADOS.find((e) => e.valor === texto(parametros.estado))?.valor ??
      "todos") as FiltrosAdmin["estado"],
    pagina: Number(texto(parametros.pagina)) || 1,
  };

  const [{ productos, total, pagina, paginas }, categorias, configuracion] =
    await Promise.all([
      listarProductosAdmin(filtros),
      listarCategoriasPlanas(),
      obtenerConfiguracion(),
    ]);

  return (
    <>
      <EncabezadoPanel
        titulo="Productos"
        descripcion={`${total} ${total === 1 ? "producto" : "productos"} en el sistema.`}
        acciones={
          <BotonLink href="/admin/productos/nuevo">+ Nuevo producto</BotonLink>
        }
      />

      <form
        method="get"
        className="mb-5 flex flex-wrap items-end gap-3 rounded-2xl border border-borde bg-carbon p-4"
      >
        <div className="min-w-[200px] flex-1">
          <label
            htmlFor="q"
            className="mb-1.5 block text-[0.72rem] font-bold uppercase tracking-[0.1em] text-tenue"
          >
            Buscar
          </label>
          <input
            id="q"
            name="q"
            defaultValue={filtros.texto}
            placeholder="Nombre, marca o código…"
            className="w-full rounded-[10px] border border-borde bg-carbon-2 px-3.5 py-2.5 text-[0.9rem] text-texto placeholder:text-tenue focus:border-naranja focus:outline-none"
          />
        </div>

        <div>
          <label
            htmlFor="categoria"
            className="mb-1.5 block text-[0.72rem] font-bold uppercase tracking-[0.1em] text-tenue"
          >
            Categoría
          </label>
          <select
            id="categoria"
            name="categoria"
            defaultValue={filtros.categoriaId ?? ""}
            className="rounded-[10px] border border-borde bg-carbon-2 px-3.5 py-2.5 text-[0.9rem] text-texto focus:border-naranja focus:outline-none"
          >
            <option value="">Todas</option>
            {categorias.map((categoria) => (
              <option key={categoria.id} value={categoria.id}>
                {categoria.padre
                  ? `${categoria.padre.nombre} › ${categoria.nombre}`
                  : categoria.nombre}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="estado"
            className="mb-1.5 block text-[0.72rem] font-bold uppercase tracking-[0.1em] text-tenue"
          >
            Estado
          </label>
          <select
            id="estado"
            name="estado"
            defaultValue={filtros.estado}
            className="rounded-[10px] border border-borde bg-carbon-2 px-3.5 py-2.5 text-[0.9rem] text-texto focus:border-naranja focus:outline-none"
          >
            {ESTADOS.map((estado) => (
              <option key={estado.valor} value={estado.valor}>
                {estado.texto}
              </option>
            ))}
          </select>
        </div>

        <Boton type="submit" variante="secundario">
          Filtrar
        </Boton>
      </form>

      {productos.length === 0 ? (
        <EstadoVacio titulo="No hay productos con esos filtros">
          Probá con otra búsqueda, o{" "}
          <Link href="/admin/productos/nuevo" className="text-naranja hover:underline">
            agregá el primero
          </Link>
          .
        </EstadoVacio>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-borde">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead>
              <tr className="bg-carbon text-[0.72rem] uppercase tracking-[0.09em] text-tenue">
                <th className="px-4 py-3 font-bold">Producto</th>
                <th className="px-4 py-3 font-bold">Precio</th>
                <th className="px-4 py-3 font-bold">Existencias</th>
                <th className="px-4 py-3 font-bold">Estado</th>
                <th className="px-4 py-3 font-bold"></th>
              </tr>
            </thead>
            <tbody>
              {productos.map((producto) => {
                const precio = resolverPrecio(
                  producto,
                  configuracion.mostrarPreciosPorDefecto
                );
                const unidades = totalUnidades(producto.existencias);

                return (
                  <tr
                    key={producto.id}
                    className="border-t border-borde bg-carbon/40 align-top"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/productos/${producto.id}`}
                        className="font-semibold hover:text-naranja"
                      >
                        {producto.nombre}
                      </Link>
                      <p className="mt-0.5 text-[0.76rem] text-tenue">
                        {[producto.marca?.nombre, producto.categoria.nombre, producto.sku]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      {precio.visible ? (
                        <>
                          <span className="font-bold">{monto(precio.precio)}</span>
                          {precio.precioAnterior && (
                            <s className="ml-2 text-[0.78rem] text-tenue">
                              {monto(precio.precioAnterior)}
                            </s>
                          )}
                        </>
                      ) : (
                        <span className="text-[0.82rem] text-tenue">
                          {TEXTO_PRECIO_OCULTO}
                          <span className="block text-[0.7rem]">
                            (interno: {monto(producto.precio)})
                          </span>
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5 text-[0.78rem]">
                        {producto.existencias.map((existencia) => (
                          <span
                            key={existencia.sedeId}
                            className={CLASE_ESTADO[existencia.estado]}
                          >
                            {existencia.sedeNombre}: {existencia.cantidad}{" "}
                            <span className="text-tenue">
                              ({TEXTO_ESTADO_STOCK[existencia.estado]})
                            </span>
                          </span>
                        ))}
                        {producto.existencias.length === 0 && (
                          <span className="text-tenue">Sin existencias cargadas</span>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex flex-col items-start gap-1.5">
                        <Insignia tono={producto.publicado ? "verde" : "neutro"}>
                          {producto.publicado ? "Publicado" : "Oculto"}
                        </Insignia>
                        {unidades === 0 && <Insignia tono="rojo">Sin stock</Insignia>}
                        {producto.destacado && (
                          <Insignia tono="naranja">Destacado</Insignia>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex flex-col items-end gap-2">
                        <BotonLink
                          href={`/admin/productos/${producto.id}`}
                          variante="secundario"
                          tamano="sm"
                        >
                          Editar
                        </BotonLink>
                        <form action={alternarPublicado}>
                          <input type="hidden" name="id" value={producto.id} />
                          <Boton type="submit" variante="fantasma" tamano="sm">
                            {producto.publicado ? "Despublicar" : "Publicar"}
                          </Boton>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {paginas > 1 && (
        <nav className="mt-5 flex items-center justify-center gap-3 text-[0.85rem]">
          {pagina > 1 && (
            <Link
              href={{ query: { ...parametros, pagina: pagina - 1 } }}
              className="text-naranja hover:underline"
            >
              ← Anterior
            </Link>
          )}
          <span className="text-tenue">
            Página {pagina} de {paginas}
          </span>
          {pagina < paginas && (
            <Link
              href={{ query: { ...parametros, pagina: pagina + 1 } }}
              className="text-naranja hover:underline"
            >
              Siguiente →
            </Link>
          )}
        </nav>
      )}
    </>
  );
}
