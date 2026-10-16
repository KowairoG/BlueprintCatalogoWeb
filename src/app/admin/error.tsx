"use client";

import { Boton, BotonLink } from "@/components/ui/Boton";
import { Mensaje } from "@/components/ui/Mensaje";
import { EncabezadoPanel } from "@/components/ui/Panel";

/**
 * Red de seguridad del panel.
 *
 * Si algo revienta en una pantalla, se muestra esto en vez de la pantalla en
 * blanco de "A server error occurred". Next.js oculta el detalle del error en
 * producción a propósito, así que acá se muestra el identificador (`digest`),
 * que es lo que permite encontrarlo en los registros del servidor.
 */
export default function ErrorAdmin({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <>
      <EncabezadoPanel titulo="Algo salió mal" />

      <div className="flex flex-col gap-4">
        <Mensaje tono="error">
          {error.message || "No pudimos cargar esta sección."}
        </Mensaje>

        {error.digest && (
          <p className="text-[0.8rem] text-tenue">
            Código del error: <code>{error.digest}</code>
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Boton onClick={reset}>Reintentar</Boton>
          <BotonLink href="/admin" variante="secundario">
            Volver al panel
          </BotonLink>
        </div>
      </div>
    </>
  );
}
