"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import { Boton } from "@/components/ui/Boton";
import {
  CampoArea,
  CampoCasilla,
  CampoSelect,
  CampoTexto,
} from "@/components/ui/Campo";
import { Mensaje, MensajeAccion } from "@/components/ui/Mensaje";
import { Tarjeta } from "@/components/ui/Panel";
import { ESTADO_INICIAL } from "@/lib/acciones";
import {
  ETIQUETAS_PRODUCTO,
  TEXTO_ESTADO_STOCK,
  TEXTO_ETIQUETA,
} from "@/lib/constantes";
import { MONEDA, monto } from "@/lib/money";
import { estadoDeStock } from "@/lib/stock";
// Se importa del módulo de tipos y no de `@/lib/storage`: ese índice carga la
// implementación de disco, que usa `node:fs` y no puede viajar al navegador.
import { TIPOS_PERMITIDOS } from "@/lib/storage/tipos";
import {
  actualizarProducto,
  crearProducto,
  eliminarImagen,
} from "@/features/productos/actions";

/**
 * Alta y edición de un producto en UNA sola pantalla: datos, precio, fotos y
 * existencias de todas las sedes con un solo guardado. Es una tarea frecuente,
 * así que no se parte en pasos.
 */

const ID_FORMULARIO = "formulario-producto";

export type OpcionSimple = { id: string; nombre: string; grupo?: string };

export type SedeConCantidad = {
  id: string;
  nombre: string;
  cantidad: number;
  umbralBajo: number;
};

export type ImagenExistente = { id: string; url: string; alt: string | null };

export type ValoresProducto = {
  id?: string;
  nombre: string;
  sku: string;
  descripcion: string;
  emoji: string;
  categoriaId: string;
  marcaId: string;
  precio: string;
  precioAnterior: string;
  /** "" hereda la política global, "si" muestra, "no" oculta. */
  mostrarPrecio: "" | "si" | "no";
  etiqueta: string;
  publicado: boolean;
  destacado: boolean;
  codigoExterno: string;
};

type Props = {
  modo: "crear" | "editar";
  valores: ValoresProducto;
  categorias: OpcionSimple[];
  marcas: OpcionSimple[];
  sedes: SedeConCantidad[];
  imagenes?: ImagenExistente[];
  /** true cuando el stock lo manda un sistema externo. */
  inventarioSoloLectura: boolean;
  nombreInventario: string;
  mostrarPreciosPorDefecto: boolean;
};

export function FormularioProducto({
  modo,
  valores,
  categorias,
  marcas,
  sedes,
  imagenes = [],
  inventarioSoloLectura,
  nombreInventario,
  mostrarPreciosPorDefecto,
}: Props) {
  const [estado, accion, pendiente] = useActionState(
    modo === "crear" ? crearProducto : actualizarProducto,
    ESTADO_INICIAL
  );

  // Si la acción falló, `estado.valores` trae lo que el usuario había enviado;
  // se usa para repoblar el formulario en lugar de los valores iniciales.
  const v = (estado.valores as ValoresProducto | undefined) ?? valores;

  const [visibilidad, setVisibilidad] = useState(valores.mostrarPrecio);

  const precioVisible =
    visibilidad === "si" || (visibilidad === "" && mostrarPreciosPorDefecto);

  return (
    <>
      {/*
        Los formularios de borrado van FUERA del formulario principal, porque
        HTML no permite anidarlos. Cada botón de la galería se conecta al suyo
        con el atributo `form`. Así borrar una foto no arrastra —ni pierde— lo
        que el usuario venía escribiendo.
      */}
      {imagenes.map((imagen) => (
        <form
          key={`borrar-${imagen.id}`}
          id={`borrar-imagen-${imagen.id}`}
          action={eliminarImagen}
          className="hidden"
        >
          <input type="hidden" name="imagenId" value={imagen.id} />
        </form>
      ))}

      {/*
        `key` con el nonce del resultado: ante un fallo, React remonta el form y
        los inputs toman de nuevo su `defaultValue` (ya repoblado con `v`), en
        vez de quedar vacíos por el reset automático de React 19.
      */}
      <form
        key={estado.nonce ?? "inicial"}
        id={ID_FORMULARIO}
        action={accion}
        className="flex flex-col gap-5"
      >
        {valores.id && <input type="hidden" name="id" value={valores.id} />}

        <MensajeAccion estado={estado} />

        <Tarjeta titulo="Datos del producto">
          <div className="flex flex-col gap-4">
            <CampoTexto
              etiqueta="Nombre"
              name="nombre"
              defaultValue={v.nombre}
              placeholder="Nombre del producto"
              required
              errores={estado.errores?.nombre}
              ayuda="Corto y concreto: los nombres larguísimos se cortan feo en la tarjeta."
            />

            <CampoArea
              etiqueta="Descripción"
              name="descripcion"
              defaultValue={v.descripcion}
              rows={3}
              placeholder="Opcional: escribí lo que quieras sobre el producto."
              errores={estado.errores?.descripcion}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <CampoSelect
                etiqueta="Categoría"
                name="categoriaId"
                defaultValue={v.categoriaId}
                required
                errores={estado.errores?.categoriaId}
              >
                <option value="">Elegí una categoría…</option>
                {categorias.map((categoria) => (
                  <option key={categoria.id} value={categoria.id}>
                    {categoria.grupo
                      ? `${categoria.grupo} › ${categoria.nombre}`
                      : categoria.nombre}
                  </option>
                ))}
              </CampoSelect>

              <CampoSelect
                etiqueta="Marca"
                name="marcaId"
                defaultValue={v.marcaId}
                errores={estado.errores?.marcaId}
              >
                <option value="">Sin marca</option>
                {marcas.map((marca) => (
                  <option key={marca.id} value={marca.id}>
                    {marca.nombre}
                  </option>
                ))}
              </CampoSelect>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <CampoTexto
                etiqueta="Código / SKU"
                name="sku"
                defaultValue={v.sku}
                placeholder="ABC-001"
                errores={estado.errores?.sku}
                ayuda="Opcional, pero ayuda muchísimo por WhatsApp."
              />
              <CampoTexto
                etiqueta="Emoji"
                name="emoji"
                defaultValue={v.emoji}
                placeholder="📦"
                maxLength={8}
                errores={estado.errores?.emoji}
                ayuda="Se usa si todavía no hay foto."
              />
              <CampoSelect
                etiqueta="Etiqueta"
                name="etiqueta"
                defaultValue={v.etiqueta}
                errores={estado.errores?.etiqueta}
              >
                <option value="">Sin etiqueta</option>
                {ETIQUETAS_PRODUCTO.map((etiqueta) => (
                  <option key={etiqueta} value={etiqueta}>
                    {TEXTO_ETIQUETA[etiqueta]}
                  </option>
                ))}
              </CampoSelect>
            </div>
          </div>
        </Tarjeta>

        <Tarjeta
          titulo="Precio"
          descripcion="El precio se guarda siempre, aunque decidas no publicarlo. Sirve como control interno."
        >
          <div className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <CampoTexto
                etiqueta={`Precio (${MONEDA.codigo})`}
                name="precio"
                inputMode="numeric"
                defaultValue={v.precio}
                placeholder="10000"
                required
                errores={estado.errores?.precio}
              />
              <CampoTexto
                etiqueta="Precio anterior"
                name="precioAnterior"
                inputMode="numeric"
                defaultValue={v.precioAnterior}
                placeholder="12000"
                errores={estado.errores?.precioAnterior}
                ayuda="Solo si está en oferta. Se muestra tachado."
              />
            </div>

            <CampoSelect
              etiqueta="¿Mostrar el precio en el sitio?"
              name="mostrarPrecio"
              value={visibilidad}
              onChange={(evento) =>
                setVisibilidad(
                  evento.target.value as ValoresProducto["mostrarPrecio"]
                )
              }
              errores={estado.errores?.mostrarPrecio}
            >
              <option value="">
                Usar la política general (
                {mostrarPreciosPorDefecto ? "mostrar" : "ocultar"})
              </option>
              <option value="si">Mostrar siempre este precio</option>
              <option value="no">Ocultar siempre este precio</option>
            </CampoSelect>

            <Mensaje tono={precioVisible ? "info" : "aviso"}>
              {precioVisible
                ? "En el catálogo se va a ver el precio."
                : 'En el catálogo va a decir "Consultar precio" y se destaca el botón de WhatsApp.'}
            </Mensaje>
          </div>
        </Tarjeta>

        <Tarjeta
          titulo="Fotos"
          descripcion="JPG, PNG, WebP o AVIF. Hasta 5 MB cada una."
        >
          <div className="flex flex-col gap-4">
            {imagenes.length > 0 && (
              <ul className="flex flex-wrap gap-3">
                {imagenes.map((imagen) => (
                  <li
                    key={imagen.id}
                    className="relative overflow-hidden rounded-xl border border-borde bg-carbon-2"
                  >
                    <Image
                      src={imagen.url}
                      alt={imagen.alt ?? ""}
                      width={110}
                      height={110}
                      className="size-[110px] object-cover"
                    />
                    <button
                      type="submit"
                      form={`borrar-imagen-${imagen.id}`}
                      aria-label="Quitar esta foto"
                      className="absolute top-1 right-1 grid size-6 cursor-pointer place-items-center rounded-md bg-negro/80 text-[0.7rem] text-rojo hover:bg-rojo hover:text-white"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <input
              type="file"
              name="imagenes"
              multiple
              accept={TIPOS_PERMITIDOS.join(",")}
              className="w-full cursor-pointer rounded-[10px] border border-dashed border-borde bg-carbon px-3.5 py-3 text-[0.85rem] text-tenue file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-carbon-2 file:px-3 file:py-1.5 file:text-[0.8rem] file:font-bold file:text-texto"
            />
          </div>
        </Tarjeta>

        <Tarjeta
          titulo="Existencias por sede"
          descripcion={
            inventarioSoloLectura
              ? `Las cantidades las manda ${nombreInventario} y no se editan desde acá.`
              : "Cantidad de unidades en cada local. En 0 el catálogo muestra “Agotado”."
          }
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sedes.map((sede) => (
              <CampoTexto
                key={sede.id}
                etiqueta={sede.nombre}
                name={`existencia_${sede.id}`}
                inputMode="numeric"
                defaultValue={String(sede.cantidad)}
                disabled={inventarioSoloLectura}
                ayuda={
                  TEXTO_ESTADO_STOCK[
                    estadoDeStock(sede.cantidad, sede.umbralBajo)
                  ]
                }
              />
            ))}
          </div>
        </Tarjeta>

        <Tarjeta titulo="Publicación">
          <div className="flex flex-col gap-3">
            <CampoCasilla
              etiqueta="Publicado"
              name="publicado"
              defaultChecked={v.publicado}
              ayuda="Si lo apagás, desaparece del catálogo público pero se mantiene acá."
            />
            <CampoCasilla
              etiqueta="Destacado"
              name="destacado"
              defaultChecked={v.destacado}
              ayuda="Aparece de primero cuando el orden es por relevancia."
            />
            <CampoTexto
              etiqueta="Código en sistema externo"
              name="codigoExterno"
              defaultValue={v.codigoExterno}
              errores={estado.errores?.codigoExterno}
              ayuda="Opcional. Es el código de este producto en el sistema de facturación, para cuando se conecte la sincronización de existencias."
            />
          </div>
        </Tarjeta>

        <div className="sticky bottom-0 -mx-5 flex flex-wrap items-center gap-3 border-t border-borde bg-negro/95 px-5 py-4 backdrop-blur lg:-mx-9 lg:px-9">
          <Boton type="submit" disabled={pendiente}>
            {pendiente
              ? "Guardando…"
              : modo === "crear"
                ? "Crear producto"
                : "Guardar cambios"}
          </Boton>
          <span className="text-[0.8rem] text-tenue">
            {precioVisible
              ? `Se publica a ${monto(Number(v.precio) || 0)}`
              : "Precio oculto en el sitio"}
          </span>
        </div>
      </form>
    </>
  );
}
