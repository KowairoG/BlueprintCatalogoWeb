import Image from "next/image";
import Link from "next/link";
import { TEXTO_ESTADO_STOCK, TEXTO_ETIQUETA, esEtiquetaProducto } from "@/lib/constantes";
import { monto, porcentajeDescuento } from "@/lib/money";
import { resolverPrecio, TEXTO_PRECIO_OCULTO } from "@/lib/precio";
import { CLASE_ESTADO, CLASE_PUNTO } from "@/lib/stock";
import { linkCotizacion } from "@/lib/whatsapp";
import type { ProductoTarjeta } from "@/features/productos/queries";

/**
 * Tarjeta del catálogo. Es la traducción a React de la `.card` del prototipo:
 * mismo layout, mismos colores, mismos textos.
 */

export function TarjetaProducto({
  producto,
  mostrarPreciosPorDefecto,
  whatsapp,
  sedeFiltrada,
}: {
  producto: ProductoTarjeta;
  mostrarPreciosPorDefecto: boolean;
  whatsapp: string;
  /** Si el visitante filtró por una sede, solo se muestra el stock de esa. */
  sedeFiltrada?: string;
}) {
  const precio = resolverPrecio(producto, mostrarPreciosPorDefecto);
  const descuento = precio.visible
    ? porcentajeDescuento(precio.precio, precio.precioAnterior)
    : null;

  const existencias = sedeFiltrada
    ? producto.existencias.filter((e) => e.sedeSlug === sedeFiltrada)
    : producto.existencias;

  const imagen = producto.imagenes[0];

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-borde bg-carbon transition-[transform,border-color,box-shadow] hover:-translate-y-1 hover:border-borde-claro hover:shadow-[0_14px_32px_rgba(0,0,0,.45)]">
      <Link
        href={`/producto/${producto.slug}`}
        className="relative grid h-[186px] place-items-center border-b border-borde bg-gradient-to-br from-carbon-2 to-[var(--grad-hondo)] text-[3.1rem]"
      >
        {imagen ? (
          <Image
            src={imagen.url}
            alt={imagen.alt ?? producto.nombre}
            fill
            sizes="(max-width: 640px) 100vw, 280px"
            className="object-cover"
          />
        ) : (
          <span aria-hidden>{producto.emoji}</span>
        )}

        <div className="absolute top-3 left-3 flex flex-col items-start gap-1.5">
          {esEtiquetaProducto(producto.etiqueta) && (
            <Etiqueta tipo={producto.etiqueta} />
          )}
          {descuento !== null && (
            <span className="rounded-md bg-rojo px-2.5 py-1 text-[0.66rem] font-extrabold tracking-[0.07em] text-white">
              −{descuento}%
            </span>
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-4">
        {producto.marca && (
          <span className="text-[0.68rem] font-extrabold uppercase tracking-[0.13em] text-naranja">
            {producto.marca.nombre}
          </span>
        )}

        <h3 className="mt-1.5 text-[0.96rem] font-bold leading-[1.34]">
          <Link href={`/producto/${producto.slug}`} className="hover:text-naranja">
            {producto.nombre}
          </Link>
        </h3>

        <p className="mt-1.5 flex-1 text-[0.8rem] text-tenue">
          {producto.descripcion}
        </p>

        <div className="mt-3.5 flex items-baseline gap-2.5">
          {precio.visible ? (
            <>
              <strong className="text-[1.3rem] font-black tracking-[-0.02em]">
                {monto(precio.precio)}
              </strong>
              {precio.precioAnterior && (
                <s className="text-[0.85rem] text-tenue">
                  {monto(precio.precioAnterior)}
                </s>
              )}
            </>
          ) : (
            <span className="text-[1.05rem] font-bold text-naranja">
              {TEXTO_PRECIO_OCULTO}
            </span>
          )}
        </div>

        <div className="mt-3 flex flex-col gap-1.5 border-t border-dashed border-borde pt-3">
          {existencias.map((existencia) => (
            <div
              key={existencia.sedeId}
              className="flex items-center justify-between text-[0.77rem]"
            >
              <span className="text-tenue">{existencia.sedeNombre}</span>
              <b
                className={`flex items-center gap-1.5 font-semibold ${CLASE_ESTADO[existencia.estado]}`}
              >
                <span
                  aria-hidden
                  className={`inline-block size-[7px] rounded-full ${CLASE_PUNTO[existencia.estado]}`}
                />
                {TEXTO_ESTADO_STOCK[existencia.estado]}
              </b>
            </div>
          ))}
          {existencias.length === 0 && (
            <p className="text-[0.77rem] text-tenue">
              Consultanos la disponibilidad.
            </p>
          )}
        </div>

        <a
          href={linkCotizacion(whatsapp, {
            nombre: producto.nombre,
            sku: producto.sku,
          })}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-[10px] bg-wa py-2.5 text-[0.87rem] font-extrabold text-wa-oscuro transition-[filter] hover:brightness-110"
        >
          Cotizar por WhatsApp
        </a>
      </div>
    </article>
  );
}

function Etiqueta({ tipo }: { tipo: "NUEVO" | "OFERTA" | "TOP" }) {
  const estilos = {
    NUEVO: "bg-naranja text-naranja-oscuro",
    OFERTA: "bg-rojo text-white",
    TOP: "bg-texto text-negro",
  } as const;

  return (
    <span
      className={`rounded-md px-2.5 py-1 text-[0.66rem] font-extrabold uppercase tracking-[0.07em] ${estilos[tipo]}`}
    >
      {TEXTO_ETIQUETA[tipo]}
    </span>
  );
}
