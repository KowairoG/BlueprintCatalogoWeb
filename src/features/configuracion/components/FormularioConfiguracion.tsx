"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import { Boton } from "@/components/ui/Boton";
import { Campo, CampoCasilla, CampoTexto } from "@/components/ui/Campo";
import { Mensaje, MensajeAccion } from "@/components/ui/Mensaje";
import { Tarjeta } from "@/components/ui/Panel";
import { ESTADO_INICIAL } from "@/lib/acciones";
import { TIPOS_PERMITIDOS } from "@/lib/storage/tipos";
import { guardarConfiguracion } from "@/features/configuracion/actions";

export type ValoresConfiguracion = {
  nombreNegocio: string;
  nombreCorto: string;
  rubro: string;
  logoUrl: string;
  logoEmoji: string;
  eslogan: string;
  ubicacion: string;
  descripcionSeo: string;
  telefono: string;
  whatsapp: string;
  horario: string;
  avisoBarra: string;
  facebookUrl: string;
  tiktokUrl: string;
  mostrarPreciosPorDefecto: boolean;
};

export function FormularioConfiguracion({
  valores,
  productosConPrecioForzado,
}: {
  valores: ValoresConfiguracion;
  productosConPrecioForzado: number;
}) {
  const [estado, accion, pendiente] = useActionState(
    guardarConfiguracion,
    ESTADO_INICIAL
  );

  // Si falló el guardado, `estado.valores` trae lo enviado (para repoblar).
  // `logoUrl` no viene del form (es archivo), se mantiene el de `valores`.
  const v = (estado.valores as ValoresConfiguracion | undefined) ?? valores;

  const [mostrarPrecios, setMostrarPrecios] = useState(
    valores.mostrarPreciosPorDefecto
  );

  return (
    <form key={estado.nonce ?? "inicial"} action={accion} className="flex flex-col gap-5">
      <MensajeAccion estado={estado} />

      <Tarjeta
        titulo="Precios"
        descripcion="Publicar los precios es una decisión comercial, no un supuesto del sistema. Acá se define la política general, y cada producto puede hacer su excepción."
      >
        <div className="flex flex-col gap-3">
          <CampoCasilla
            etiqueta="Publicar los precios en el sitio"
            name="mostrarPreciosPorDefecto"
            checked={mostrarPrecios}
            onChange={(evento) => setMostrarPrecios(evento.target.checked)}
            ayuda="Se aplica a todos los productos que no tengan una decisión propia."
          />

          <Mensaje tono={mostrarPrecios ? "info" : "aviso"}>
            {mostrarPrecios
              ? "El catálogo muestra los precios y permite ordenar por precio."
              : 'El catálogo dice "Consultar precio" y el botón de WhatsApp toma protagonismo. Los precios se siguen guardando para control interno.'}
          </Mensaje>

          {productosConPrecioForzado > 0 && (
            <p className="text-[0.82rem] text-tenue">
              {productosConPrecioForzado}{" "}
              {productosConPrecioForzado === 1
                ? "producto tiene"
                : "productos tienen"}{" "}
              una decisión propia y no se ven afectados por este interruptor.
            </p>
          )}
        </div>
      </Tarjeta>

      <Tarjeta
        titulo="Identidad"
        descripcion="Lo que se ve en el logo, en la pestaña del navegador y cuando alguien comparte el link por WhatsApp."
      >
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <CampoTexto
              etiqueta="Nombre completo"
              name="nombreNegocio"
              defaultValue={v.nombreNegocio}
              required
              errores={estado.errores?.nombreNegocio}
              ayuda="Va en el pie de página y en los buscadores."
            />
            <CampoTexto
              etiqueta="Eslogan"
              name="eslogan"
              defaultValue={v.eslogan}
              errores={estado.errores?.eslogan}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <CampoTexto
              etiqueta="Logo · línea grande"
              name="nombreCorto"
              defaultValue={v.nombreCorto}
              required
              errores={estado.errores?.nombreCorto}
              ayuda="Ej. TIENDA"
            />
            <CampoTexto
              etiqueta="Logo · línea chica"
              name="rubro"
              defaultValue={v.rubro}
              errores={estado.errores?.rubro}
              ayuda="Ej. FERRETERÍA"
            />
            <CampoTexto
              etiqueta="Emoji de respaldo"
              name="logoEmoji"
              defaultValue={v.logoEmoji}
              maxLength={8}
              errores={estado.errores?.logoEmoji}
              ayuda="Se usa si no hay archivo de logo."
            />
          </div>

          <Campo
            etiqueta="Archivo del logo"
            htmlFor="logo"
            ayuda={
              <>
                PNG con fondo transparente. El sitio es oscuro: un logo con
                fondo blanco o gris se va a ver como un recuadro.
              </>
            }
          >
            <div className="flex flex-wrap items-center gap-4">
              {valores.logoUrl ? (
                <span className="grid size-16 shrink-0 place-items-center rounded-xl border border-borde bg-carbon-2">
                  <Image
                    src={valores.logoUrl}
                    alt="Logo actual"
                    width={56}
                    height={56}
                    className="size-14 object-contain"
                  />
                </span>
              ) : (
                <span className="grid size-16 shrink-0 place-items-center rounded-xl border border-dashed border-borde text-2xl">
                  {v.logoEmoji}
                </span>
              )}

              <input
                type="file"
                id="logo"
                name="logo"
                accept={TIPOS_PERMITIDOS.join(",")}
                className="min-w-[220px] flex-1 cursor-pointer rounded-[10px] border border-dashed border-borde bg-carbon px-3.5 py-3 text-[0.85rem] text-tenue file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-carbon-2 file:px-3 file:py-1.5 file:text-[0.8rem] file:font-bold file:text-texto"
              />
            </div>
          </Campo>

          {valores.logoUrl && (
            <CampoCasilla
              etiqueta="Quitar el logo y volver al emoji"
              name="quitarLogo"
              ayuda="Se aplica al guardar. El archivo se borra del servidor."
            />
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <CampoTexto
              etiqueta="Ubicación"
              name="ubicacion"
              defaultValue={v.ubicacion}
              placeholder="Ciudad, provincia, país"
              errores={estado.errores?.ubicacion}
            />
            <CampoTexto
              etiqueta="Descripción para buscadores"
              name="descripcionSeo"
              defaultValue={v.descripcionSeo}
              errores={estado.errores?.descripcionSeo}
              ayuda="Una o dos frases. Es lo que se lee bajo el título en Google."
            />
          </div>
        </div>
      </Tarjeta>

      <Tarjeta titulo="Contacto">
        <div className="flex flex-col gap-4">

          <div className="grid gap-4 sm:grid-cols-3">
            <CampoTexto
              etiqueta="Teléfono"
              name="telefono"
              defaultValue={v.telefono}
              placeholder="2222 3333"
              required
              errores={estado.errores?.telefono}
            />
            <CampoTexto
              etiqueta="WhatsApp"
              name="whatsapp"
              defaultValue={v.whatsapp}
              placeholder="50622223333"
              required
              errores={estado.errores?.whatsapp}
              ayuda="Con código de país y sin signos."
            />
            <CampoTexto
              etiqueta="Horario"
              name="horario"
              defaultValue={v.horario}
              errores={estado.errores?.horario}
            />
          </div>

          <CampoTexto
            etiqueta="Aviso de la barra superior"
            name="avisoBarra"
            defaultValue={v.avisoBarra}
            errores={estado.errores?.avisoBarra}
            ayuda="La franja naranja que cruza el sitio. Sirve para promos y avisos."
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <CampoTexto
              etiqueta="Facebook"
              name="facebookUrl"
              defaultValue={v.facebookUrl}
              errores={estado.errores?.facebookUrl}
            />
            <CampoTexto
              etiqueta="TikTok"
              name="tiktokUrl"
              defaultValue={v.tiktokUrl}
              errores={estado.errores?.tiktokUrl}
            />
          </div>
        </div>
      </Tarjeta>

      <div>
        <Boton type="submit" disabled={pendiente}>
          {pendiente ? "Guardando…" : "Guardar configuración"}
        </Boton>
      </div>
    </form>
  );
}
