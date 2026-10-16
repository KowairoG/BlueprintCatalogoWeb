import type { Metadata } from "next";
import { EncabezadoPanel } from "@/components/ui/Panel";
import { db } from "@/lib/db";
import { requireUsuario } from "@/lib/guards";
import { obtenerConfiguracion } from "@/features/configuracion/queries";
import { FormularioConfiguracion } from "@/features/configuracion/components/FormularioConfiguracion";

export const metadata: Metadata = { title: "Configuración" };

export default async function PaginaConfiguracion() {
  await requireUsuario();

  const [configuracion, productosConPrecioForzado] = await Promise.all([
    obtenerConfiguracion(),
    db.producto.count({ where: { mostrarPrecio: { not: null } } }),
  ]);

  return (
    <>
      <EncabezadoPanel
        titulo="Configuración"
        descripcion="Los datos que salen en la cabecera, el pie y los enlaces de WhatsApp del sitio."
      />

      <FormularioConfiguracion
        valores={{
          nombreNegocio: configuracion.nombreNegocio,
          nombreCorto: configuracion.nombreCorto,
          rubro: configuracion.rubro,
          logoUrl: configuracion.logoUrl,
          logoEmoji: configuracion.logoEmoji,
          eslogan: configuracion.eslogan,
          ubicacion: configuracion.ubicacion,
          descripcionSeo: configuracion.descripcionSeo,
          telefono: configuracion.telefono,
          whatsapp: configuracion.whatsapp,
          horario: configuracion.horario,
          avisoBarra: configuracion.avisoBarra,
          facebookUrl: configuracion.facebookUrl,
          tiktokUrl: configuracion.tiktokUrl,
          mostrarPreciosPorDefecto: configuracion.mostrarPreciosPorDefecto,
        }}
        productosConPrecioForzado={productosConPrecioForzado}
      />
    </>
  );
}
