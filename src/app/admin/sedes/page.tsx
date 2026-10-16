import type { Metadata } from "next";
import { EncabezadoPanel, Insignia, Tarjeta } from "@/components/ui/Panel";
import { db } from "@/lib/db";
import { requireUsuario } from "@/lib/guards";
import {
  BotonEliminarSede,
  FormularioSede,
} from "@/features/sedes/components/FormularioSede";

export const metadata: Metadata = { title: "Sedes" };

export default async function PaginaSedes() {
  await requireUsuario();

  const sedes = await db.sede.findMany({
    orderBy: { orden: "asc" },
    include: {
      _count: { select: { existencias: true } },
    },
  });

  return (
    <>
      <EncabezadoPanel
        titulo="Sedes"
        descripcion="Cada sede abierta lleva su propio inventario. Las marcadas “Próximamente” se anuncian en el sitio pero no llevan existencias."
      />

      <div className="mb-6">
        <Tarjeta titulo="Agregar sede">
          <FormularioSede />
        </Tarjeta>
      </div>

      <div className="flex flex-col gap-4">
        {sedes.map((sede) => (
          <section
            key={sede.id}
            className="rounded-2xl border border-borde bg-carbon px-5 py-4"
          >
            <div className="flex flex-wrap items-start gap-3">
              <div className="min-w-0 flex-1">
                <h2 className="font-extrabold">{sede.nombre}</h2>
                <p className="text-[0.85rem] text-tenue">{sede.direccion}</p>
                {sede.telefono && (
                  <p className="text-[0.8rem] text-tenue">{sede.telefono}</p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {sede.proximamente && <Insignia tono="naranja">Próximamente</Insignia>}
                <Insignia tono={sede.activa ? "verde" : "neutro"}>
                  {sede.activa ? "Activa" : "Inactiva"}
                </Insignia>
                {!sede.proximamente && (
                  <Insignia>{sede._count.existencias} productos</Insignia>
                )}
              </div>
            </div>

            <details className="group mt-3">
              <summary className="cursor-pointer list-none text-[0.82rem] text-tenue hover:text-naranja">
                <span className="group-open:hidden">✎ Editar esta sede</span>
                <span className="hidden group-open:inline">✕ Cerrar</span>
              </summary>
              <div className="mt-4 flex flex-col gap-5 border-t border-borde pt-4">
                <FormularioSede
                  valores={{
                    id: sede.id,
                    nombre: sede.nombre,
                    direccion: sede.direccion,
                    telefono: sede.telefono ?? "",
                    orden: sede.orden,
                    activa: sede.activa,
                    proximamente: sede.proximamente,
                  }}
                />
                <BotonEliminarSede id={sede.id} />
              </div>
            </details>
          </section>
        ))}
      </div>
    </>
  );
}
