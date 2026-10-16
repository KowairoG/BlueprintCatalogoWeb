import type { Metadata } from "next";
import { Boton } from "@/components/ui/Boton";
import { EncabezadoPanel, Insignia, Tarjeta } from "@/components/ui/Panel";
import { db } from "@/lib/db";
import { requireUsuario } from "@/lib/guards";
import { eliminarCategoria } from "@/features/categorias/actions";
import { FormularioCategoria } from "@/features/categorias/components/FormularioCategoria";

export const metadata: Metadata = { title: "Categorías" };

export default async function PaginaCategorias() {
  await requireUsuario();

  const categorias = await db.categoria.findMany({
    where: { padreId: null },
    orderBy: { orden: "asc" },
    include: {
      _count: { select: { productos: true } },
      hijas: {
        orderBy: { orden: "asc" },
        include: { _count: { select: { productos: true } } },
      },
    },
  });

  const madres = categorias.map((c) => ({ id: c.id, nombre: c.nombre }));

  return (
    <>
      <EncabezadoPanel
        titulo="Categorías"
        descripcion="El árbol que arma el mega menú del sitio. Las principales se ven en la columna izquierda del menú; las que dependen de ellas, en el panel de la derecha."
      />

      <div className="mb-6">
        <Tarjeta titulo="Agregar categoría">
          <FormularioCategoria madres={madres} />
        </Tarjeta>
      </div>

      <div className="flex flex-col gap-4">
        {categorias.map((categoria) => (
          <section
            key={categoria.id}
            className="rounded-2xl border border-borde bg-carbon"
          >
            <header className="flex flex-wrap items-center gap-3 border-b border-borde px-5 py-4">
              <span className="text-xl" aria-hidden>
                {categoria.icono}
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="font-extrabold">{categoria.nombre}</h2>
                {categoria.descripcion && (
                  <p className="text-[0.8rem] text-tenue">
                    {categoria.descripcion}
                  </p>
                )}
              </div>
              <Insignia>
                {categoria._count.productos}{" "}
                {categoria._count.productos === 1 ? "producto" : "productos"}
              </Insignia>
              <Insignia>{categoria.hijas.length} subcategorías</Insignia>
            </header>

            <div className="px-5 py-4">
              {categoria.hijas.length > 0 && (
                <ul className="mb-4 flex flex-wrap gap-2">
                  {categoria.hijas.map((hija) => (
                    <li
                      key={hija.id}
                      className="flex items-center gap-2 rounded-lg border border-borde bg-carbon-2 px-2.5 py-1.5 text-[0.82rem]"
                    >
                      <span>{hija.nombre}</span>
                      <span className="text-tenue">
                        ({hija._count.productos})
                      </span>
                      {hija._count.productos === 0 && (
                        <form action={eliminarCategoria}>
                          <input type="hidden" name="id" value={hija.id} />
                          <button
                            type="submit"
                            aria-label={`Eliminar ${hija.nombre}`}
                            className="cursor-pointer text-tenue hover:text-rojo"
                          >
                            ✕
                          </button>
                        </form>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              <details className="group">
                <summary className="cursor-pointer list-none text-[0.82rem] text-tenue hover:text-naranja">
                  <span className="group-open:hidden">✎ Editar esta categoría</span>
                  <span className="hidden group-open:inline">✕ Cerrar</span>
                </summary>
                <div className="mt-4 border-t border-borde pt-4">
                  <FormularioCategoria
                    madres={madres}
                    valores={{
                      id: categoria.id,
                      nombre: categoria.nombre,
                      icono: categoria.icono ?? "",
                      descripcion: categoria.descripcion ?? "",
                      padreId: "",
                      orden: categoria.orden,
                    }}
                  />

                  {categoria._count.productos === 0 &&
                    categoria.hijas.length === 0 && (
                      <form action={eliminarCategoria} className="mt-4">
                        <input type="hidden" name="id" value={categoria.id} />
                        <Boton type="submit" variante="peligro" tamano="sm">
                          Eliminar categoría
                        </Boton>
                      </form>
                    )}
                </div>
              </details>
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
