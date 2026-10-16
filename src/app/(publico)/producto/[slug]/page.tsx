import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  TEXTO_ESTADO_STOCK,
  TEXTO_ETIQUETA,
  esEtiquetaProducto,
} from "@/lib/constantes";
import { monto, porcentajeDescuento } from "@/lib/money";
import { resolverPrecio, TEXTO_PRECIO_OCULTO } from "@/lib/precio";
import { CLASE_ESTADO, CLASE_PUNTO } from "@/lib/stock";
import { linkCotizacion } from "@/lib/whatsapp";
import { obtenerConfiguracion } from "@/features/configuracion/queries";
import {
  obtenerProductoPorSlug,
  productosRelacionados,
} from "@/features/productos/queries";
import { TarjetaProducto } from "@/features/catalogo/components/TarjetaProducto";

export async function generateMetadata({
  params,
}: PageProps<"/producto/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const producto = await obtenerProductoPorSlug(slug);

  if (!producto) return { title: "Producto no encontrado" };

  return {
    title: producto.nombre,
    description: producto.descripcion,
  };
}

export default async function PaginaProducto({
  params,
}: PageProps<"/producto/[slug]">) {
  const { slug } = await params;

  const [producto, configuracion] = await Promise.all([
    obtenerProductoPorSlug(slug),
    obtenerConfiguracion(),
  ]);

  if (!producto) notFound();

  const precio = resolverPrecio(producto, configuracion.mostrarPreciosPorDefecto);
  const descuento = precio.visible
    ? porcentajeDescuento(precio.precio, precio.precioAnterior)
    : null;

  const relacionados = await productosRelacionados(
    producto.id,
    producto.categoriaId
  );

  const enlaceWhatsapp = linkCotizacion(configuracion.whatsapp, {
    nombre: producto.nombre,
    sku: producto.sku,
  });

  return (
    <main className="mx-auto w-full max-w-[1240px] flex-1 px-5 py-8">
      <nav
        aria-label="Miga de pan"
        className="mb-6 flex flex-wrap items-center gap-1.5 text-[0.82rem] text-tenue"
      >
        <Link href="/" className="hover:text-naranja">
          Inicio
        </Link>
        <span aria-hidden>/</span>
        {producto.categoria.padre && (
          <>
            <Link
              href={`/?cat=${producto.categoria.padre.slug}`}
              className="hover:text-naranja"
            >
              {producto.categoria.padre.nombre}
            </Link>
            <span aria-hidden>/</span>
          </>
        )}
        <Link
          href={`/?cat=${producto.categoria.slug}`}
          className="hover:text-naranja"
        >
          {producto.categoria.nombre}
        </Link>
        <span aria-hidden>/</span>
        <span className="text-texto">{producto.nombre}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          <div className="relative grid aspect-square place-items-center overflow-hidden rounded-2xl border border-borde bg-gradient-to-br from-carbon-2 to-[var(--grad-hondo)] text-[6rem]">
            {producto.imagenes[0] ? (
              <Image
                src={producto.imagenes[0].url}
                alt={producto.imagenes[0].alt ?? producto.nombre}
                fill
                sizes="(max-width: 1024px) 100vw, 560px"
                className="object-cover"
                priority
              />
            ) : (
              <span aria-hidden>{producto.emoji}</span>
            )}
          </div>

          {producto.imagenes.length > 1 && (
            <ul className="flex flex-wrap gap-2">
              {producto.imagenes.slice(1).map((imagen) => (
                <li key={imagen.id}>
                  <Image
                    src={imagen.url}
                    alt={imagen.alt ?? producto.nombre}
                    width={92}
                    height={92}
                    className="size-[92px] rounded-xl border border-borde object-cover"
                  />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            {esEtiquetaProducto(producto.etiqueta) && (
              <span className="rounded-md bg-naranja px-2.5 py-1 text-[0.68rem] font-extrabold tracking-[0.07em] text-naranja-oscuro uppercase">
                {TEXTO_ETIQUETA[producto.etiqueta]}
              </span>
            )}
            {descuento !== null && (
              <span className="rounded-md bg-rojo px-2.5 py-1 text-[0.68rem] font-extrabold text-white">
                −{descuento}%
              </span>
            )}
          </div>

          {producto.marca && (
            <p className="mt-3 text-[0.7rem] font-extrabold tracking-[0.13em] text-naranja uppercase">
              {producto.marca.nombre}
            </p>
          )}

          <h1 className="mt-1.5 text-[1.6rem] leading-tight font-black sm:text-[2rem]">
            {producto.nombre}
          </h1>

          {producto.sku && (
            <p className="mt-1.5 text-[0.82rem] text-tenue">
              Código: <span className="text-texto">{producto.sku}</span>
            </p>
          )}

          <p className="mt-4 text-[0.95rem] text-tenue">{producto.descripcion}</p>

          <div className="mt-6 flex items-baseline gap-3">
            {precio.visible ? (
              <>
                <strong className="text-[2rem] font-black tracking-[-0.02em]">
                  {monto(precio.precio)}
                </strong>
                {precio.precioAnterior && (
                  <s className="text-[1rem] text-tenue">
                    {monto(precio.precioAnterior)}
                  </s>
                )}
              </>
            ) : (
              <span className="text-[1.4rem] font-black text-naranja">
                {TEXTO_PRECIO_OCULTO}
              </span>
            )}
          </div>

          <section className="mt-6 rounded-2xl border border-borde bg-carbon p-5">
            <h2 className="mb-3 text-[0.74rem] font-extrabold tracking-[0.13em] text-naranja uppercase">
              Disponibilidad por sede
            </h2>
            <ul className="flex flex-col gap-2.5">
              {producto.existencias.map((existencia) => (
                <li
                  key={existencia.sedeId}
                  className="flex items-center justify-between gap-3 text-[0.88rem]"
                >
                  <span>{existencia.sedeNombre}</span>
                  <b
                    className={`flex items-center gap-2 font-semibold ${CLASE_ESTADO[existencia.estado]}`}
                  >
                    <span
                      aria-hidden
                      className={`inline-block size-2 rounded-full ${CLASE_PUNTO[existencia.estado]}`}
                    />
                    {TEXTO_ESTADO_STOCK[existencia.estado]}
                  </b>
                </li>
              ))}
              {producto.existencias.length === 0 && (
                <li className="text-[0.88rem] text-tenue">
                  Escribinos y confirmamos disponibilidad.
                </li>
              )}
            </ul>
          </section>

          <a
            href={enlaceWhatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 flex w-full items-center justify-center gap-2.5 rounded-xl bg-wa py-4 text-[1rem] font-extrabold text-wa-oscuro transition-[filter] hover:brightness-110"
          >
            Cotizar este producto por WhatsApp
          </a>
          <p className="mt-2 text-center text-[0.78rem] text-tenue">
            El mensaje ya va con el nombre y el código: no tenés que escribir
            nada.
          </p>
        </div>
      </div>

      {relacionados.length > 0 && (
        <section className="mt-14">
          <h2 className="mb-5 text-[1.1rem] font-extrabold">
            Más de {producto.categoria.nombre}
          </h2>
          <div className="grid gap-4.5 [grid-template-columns:repeat(auto-fill,minmax(258px,1fr))]">
            {relacionados.map((relacionado) => (
              <TarjetaProducto
                key={relacionado.id}
                producto={relacionado}
                mostrarPreciosPorDefecto={configuracion.mostrarPreciosPorDefecto}
                whatsapp={configuracion.whatsapp}
              />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
