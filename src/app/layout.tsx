import type { Metadata } from "next";
import { obtenerConfiguracion } from "@/features/configuracion/queries";
import { LOCALE } from "@/lib/region";
import { BotonTema } from "@/components/ui/BotonTema";
import "./globals.css";

/**
 * Los metadatos salen de la configuración del negocio, no del código: cambiar
 * el nombre de la tienda desde /admin/configuracion también cambia el título
 * de la pestaña y lo que se ve al compartir el link por WhatsApp.
 */
export async function generateMetadata(): Promise<Metadata> {
  const configuracion = await obtenerConfiguracion();

  const titulo = configuracion.ubicacion
    ? `${configuracion.nombreNegocio} · ${configuracion.ubicacion}`
    : configuracion.nombreNegocio;

  return {
    title: {
      default: titulo,
      template: `%s · ${configuracion.nombreNegocio}`,
    },
    description: configuracion.descripcionSeo || configuracion.eslogan,
  };
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang={LOCALE} className="h-full" suppressHydrationWarning>
      <head>
        {/* Aplica el tema guardado antes del primer pintado (sin parpadeo).
            Si no hay preferencia guardada, el CSS sigue al sistema. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              '(function(){try{var t=localStorage.getItem("tema");if(t==="dark"||t==="light")document.documentElement.setAttribute("data-theme",t);}catch(e){}})();',
          }}
        />
      </head>
      <body className="flex min-h-full flex-col">
        {children}
        <BotonTema />
      </body>
    </html>
  );
}
