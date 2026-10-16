import { linkConsultaGeneral } from "@/lib/whatsapp";
import { obtenerConfiguracion } from "@/features/configuracion/queries";
import {
  listarCategoriasMadre,
  listarMarcas,
  listarSedes,
} from "@/features/productos/queries";
import { Cabecera } from "@/features/catalogo/components/Cabecera";
import { PieDePagina } from "@/features/catalogo/components/PieDePagina";

/**
 * Envoltura del sitio público: cabecera, mega menú, pie y el botón flotante de
 * WhatsApp. Todo el contenido sale de la base de datos, nada está quemado.
 *
 * Este layout NO pide sesión: el catálogo es abierto para cualquiera.
 */

export default async function LayoutPublico({
  children,
}: LayoutProps<"/">) {
  const [configuracion, categorias, sedes, marcas] = await Promise.all([
    obtenerConfiguracion(),
    listarCategoriasMadre(),
    listarSedes(),
    listarMarcas(),
  ]);

  return (
    <>
      <Cabecera
        marca={configuracion}
        avisoBarra={configuracion.avisoBarra}
        telefono={configuracion.telefono}
        categorias={categorias.map((categoria) => ({
          id: categoria.id,
          slug: categoria.slug,
          nombre: categoria.nombre,
          icono: categoria.icono,
          descripcion: categoria.descripcion,
          cantidad: categoria._count.productos,
          hijas: categoria.hijas.map((hija) => ({
            id: hija.id,
            slug: hija.slug,
            nombre: hija.nombre,
          })),
        }))}
      />

      {children}

      <PieDePagina
        nombreNegocio={configuracion.nombreNegocio}
        ubicacion={configuracion.ubicacion}
        sedes={sedes.map((sede) => ({
          id: sede.id,
          nombre: sede.nombre,
          direccion: sede.direccion,
          proximamente: sede.proximamente,
        }))}
        telefono={configuracion.telefono}
        horario={configuracion.horario}
        facebookUrl={configuracion.facebookUrl}
        tiktokUrl={configuracion.tiktokUrl}
        marcas={marcas.map((marca) => marca.nombre)}
      />

      {/* Botón flotante de WhatsApp: siempre a un clic. */}
      <a
        href={linkConsultaGeneral(configuracion.whatsapp)}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed right-5 bottom-5 z-60 flex items-center gap-2.5 rounded-full bg-wa px-5 py-3.5 text-[0.9rem] font-extrabold text-wa-oscuro shadow-[0_8px_26px_rgba(37,211,102,.35)] transition-transform hover:scale-105"
      >
        Escribinos
      </a>
    </>
  );
}
