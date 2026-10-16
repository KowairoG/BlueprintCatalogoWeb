import Link from "next/link";
import { ORDENES_CATALOGO, TEXTO_ORDEN } from "@/lib/constantes";
import { db } from "@/lib/db";
import { permiteOrdenarPorPrecio } from "@/lib/precio";
import { obtenerConfiguracion } from "@/features/configuracion/queries";
import {
  buscarProductos,
  listarCategoriasMadre,
  listarMarcas,
  listarSedesConStock,
} from "@/features/productos/queries";
import {
  enlaceConFiltros,
  hayFiltrosActivos,
  leerFiltros,
} from "@/features/catalogo/filtros";
import { TarjetaProducto } from "@/features/catalogo/components/TarjetaProducto";

/**
 * Catálogo público. Abierto para cualquiera: no pide cuenta ni registro.
 */

export default async function PaginaCatalogo({
  searchParams,
}: PageProps<"/">) {
  const parametros = await searchParams;
  const filtros = leerFiltros(parametros);

  const configuracion = await obtenerConfiguracion();
  const permitePrecio = permiteOrdenarPorPrecio(
    configuracion.mostrarPreciosPorDefecto
  );

  const [productos, categorias, sedes, marcas, totalCatalogo] = await Promise.all([
    buscarProductos(
      {
        texto: filtros.q,
        categoriaSlug: filtros.cat || undefined,
        sedeSlug: filtros.sede || undefined,
        marcaSlug: filtros.marca || undefined,
        orden: filtros.orden,
        soloOfertas: filtros.etiqueta === "OFERTA",
      },
      { permiteOrdenarPorPrecio: permitePrecio }
    ),
    listarCategoriasMadre(),
    listarSedesConStock(),
    listarMarcas(),
    db.producto.count({ where: { publicado: true } }),
  ]);

  const ordenesVisibles = ORDENES_CATALOGO.filter(
    (orden) => permitePrecio || (orden !== "menor" && orden !== "mayor")
  );

  const marcasConProductos = marcas.filter((marca) => marca._count.productos > 0);

  return (
    <main className="flex-1">
      <section className="mx-auto max-w-[1240px] px-5 pt-9 pb-6">
        <div className="relative overflow-hidden rounded-2xl border border-borde bg-[radial-gradient(900px_380px_at_82%_12%,rgba(255,107,0,.20),transparent_62%),var(--grad-hero)] px-7 py-10 sm:px-10 sm:py-11">
          {/* El titular sale del eslogan de /admin/configuracion, así que el
              cliente lo cambia sin tocar código. La línea genérica es el
              respaldo para que la portada nunca se vea vacía. */}
          <h1 className="relative z-10 max-w-[640px] text-[1.75rem] leading-[1.14] font-black tracking-[-0.015em] sm:text-[2.35rem]">
            {configuracion.eslogan || (
              <>
                Todo lo que buscás,
                <br />
                <em className="text-naranja not-italic">en un solo lugar</em>
              </>
            )}
          </h1>
          <p className="relative z-10 mt-3.5 max-w-[520px] text-[1.02rem] text-tenue">
            Consultá qué hay disponible en {sedes.map((s) => s.nombre).join(", ")}{" "}
            antes de salir de tu casa. Cotizás por WhatsApp en un toque.
          </p>

          <dl className="relative z-10 mt-7 flex flex-wrap gap-8">
            <div>
              <dd className="text-[1.5rem] font-black text-naranja">
                {sedes.length}
              </dd>
              <dt className="text-[0.82rem] text-tenue">sedes activas</dt>
            </div>
            <div>
              <dd className="text-[1.5rem] font-black text-naranja">
                {totalCatalogo}
              </dd>
              <dt className="text-[0.82rem] text-tenue">productos en línea</dt>
            </div>
            <div>
              <dd className="text-[1.5rem] font-black text-naranja">24/7</dd>
              <dt className="text-[0.82rem] text-tenue">consulta de catálogo</dt>
            </div>
          </dl>
        </div>
      </section>

      <div className="mx-auto max-w-[1240px] px-5">
        {/* Filtro por sede: la ventaja competitiva que ningún competidor tiene. */}
        <div className="flex flex-wrap items-center gap-3 pt-4 pb-1">
          <span className="mr-1 text-[0.74rem] font-extrabold tracking-[0.11em] text-tenue uppercase">
            Ver stock de
          </span>
          <ChipSede
            href={enlaceConFiltros(filtros, { sede: "" })}
            activo={!filtros.sede}
          >
            Todas las sedes
          </ChipSede>
          {sedes.map((sede) => (
            <ChipSede
              key={sede.id}
              href={enlaceConFiltros(filtros, { sede: sede.slug })}
              activo={filtros.sede === sede.slug}
            >
              {sede.nombre}
            </ChipSede>
          ))}
        </div>

        <div className="flex flex-wrap gap-2.5 border-b border-borde py-4">
          <Chip
            href={enlaceConFiltros(filtros, { cat: "", etiqueta: "" })}
            activo={!filtros.cat && !filtros.etiqueta}
          >
            Todos
          </Chip>
          <Chip
            href={enlaceConFiltros(filtros, { etiqueta: "OFERTA", cat: "" })}
            activo={filtros.etiqueta === "OFERTA"}
          >
            Ofertas
          </Chip>
          {categorias.map((categoria) => (
            <Chip
              key={categoria.id}
              href={enlaceConFiltros(filtros, {
                cat: categoria.slug,
                etiqueta: "",
              })}
              activo={filtros.cat === categoria.slug}
            >
              {categoria.nombre}
            </Chip>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 py-5">
          <p className="text-[0.9rem] text-tenue">
            <b className="text-texto">{productos.length}</b>{" "}
            {productos.length === 1
              ? "producto encontrado"
              : "productos encontrados"}
            {filtros.q && (
              <>
                {" "}
                para <b className="text-texto">“{filtros.q}”</b>
              </>
            )}
            {hayFiltrosActivos(filtros) && (
              <>
                {" · "}
                <Link href="/" className="text-naranja hover:underline">
                  limpiar filtros
                </Link>
              </>
            )}
          </p>

          <nav aria-label="Ordenar resultados" className="flex flex-wrap gap-1.5">
            {ordenesVisibles.map((orden) => (
              <Link
                key={orden}
                href={enlaceConFiltros(filtros, { orden })}
                className={`rounded-[9px] border px-3 py-2 text-[0.8rem] transition-colors ${
                  filtros.orden === orden
                    ? "border-naranja text-naranja"
                    : "border-borde text-tenue hover:border-borde-claro hover:text-texto"
                }`}
              >
                {TEXTO_ORDEN[orden]}
              </Link>
            ))}
          </nav>
        </div>

        {marcasConProductos.length > 1 && (
          <div className="flex flex-wrap items-center gap-2 pb-5">
            <span className="mr-1 text-[0.74rem] font-extrabold tracking-[0.11em] text-tenue uppercase">
              Marca
            </span>
            <Chip
              href={enlaceConFiltros(filtros, { marca: "" })}
              activo={!filtros.marca}
            >
              Todas
            </Chip>
            {marcasConProductos.map((marca) => (
              <Chip
                key={marca.id}
                href={enlaceConFiltros(filtros, { marca: marca.slug })}
                activo={filtros.marca === marca.slug}
              >
                {marca.nombre}{" "}
                <span className="opacity-60">({marca._count.productos})</span>
              </Chip>
            ))}
          </div>
        )}
      </div>

      <div className="mx-auto grid max-w-[1240px] gap-4.5 px-5 pb-16 [grid-template-columns:repeat(auto-fill,minmax(258px,1fr))]">
        {productos.length > 0 ? (
          productos.map((producto) => (
            <TarjetaProducto
              key={producto.id}
              producto={producto}
              mostrarPreciosPorDefecto={configuracion.mostrarPreciosPorDefecto}
              whatsapp={configuracion.whatsapp}
              sedeFiltrada={filtros.sede || undefined}
            />
          ))
        ) : (
          <div className="col-span-full px-5 py-16 text-center text-tenue">
            <strong className="mb-1.5 block text-[1.1rem] text-texto">
              No encontramos nada con ese filtro
            </strong>
            Probá con otra categoría, otra sede o escribinos por WhatsApp y lo
            conseguimos.
          </div>
        )}
      </div>
    </main>
  );
}

function Chip({
  href,
  activo,
  children,
}: {
  href: string;
  activo: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-4 py-2 text-[0.86rem] font-semibold transition-colors ${
        activo
          ? "border-texto bg-texto text-negro"
          : "border-borde text-tenue hover:border-borde-claro hover:bg-carbon hover:text-texto"
      }`}
    >
      {children}
    </Link>
  );
}

function ChipSede({
  href,
  activo,
  children,
}: {
  href: string;
  activo: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-4 py-2 text-[0.85rem] font-semibold transition-colors ${
        activo
          ? "border-naranja bg-naranja text-naranja-oscuro"
          : "border-borde bg-carbon text-tenue hover:border-borde-claro hover:text-texto"
      }`}
    >
      {children}
    </Link>
  );
}
