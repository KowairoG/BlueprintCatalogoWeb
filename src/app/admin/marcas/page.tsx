import type { Metadata } from "next";
import { EncabezadoPanel, Insignia, Tarjeta } from "@/components/ui/Panel";
import { db } from "@/lib/db";
import { requireUsuario } from "@/lib/guards";
import { eliminarMarca } from "@/features/marcas/actions";
import { FormEliminar } from "@/components/ui/FormEliminar";
import { FormularioMarca } from "@/features/marcas/components/FormularioMarca";

export const metadata: Metadata = { title: "Marcas" };

export default async function PaginaMarcas() {
  await requireUsuario();

  const marcas = await db.marca.findMany({
    orderBy: [{ orden: "asc" }, { nombre: "asc" }],
    include: { _count: { select: { productos: true } } },
  });

  return (
    <>
      <EncabezadoPanel
        titulo="Marcas"
        descripcion="Las del rótulo del local y cualquier otra que vayan trayendo. En el sitio funcionan como filtro."
      />

      <div className="mb-6">
        <Tarjeta titulo="Agregar marca">
          <FormularioMarca />
        </Tarjeta>
      </div>

      <ul className="flex flex-col gap-3">
        {marcas.map((marca) => (
          <li
            key={marca.id}
            className="rounded-2xl border border-borde bg-carbon px-5 py-4"
          >
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex-1 font-bold">{marca.nombre}</span>
              <Insignia>
                {marca._count.productos}{" "}
                {marca._count.productos === 1 ? "producto" : "productos"}
              </Insignia>
              {marca._count.productos === 0 && (
                <FormEliminar
                  accion={eliminarMarca}
                  id={marca.id}
                  mensaje={`¿Eliminar la marca "${marca.nombre}"?`}
                >
                  <button
                    type="submit"
                    className="cursor-pointer text-[0.8rem] text-tenue hover:text-rojo"
                  >
                    Eliminar
                  </button>
                </FormEliminar>
              )}
            </div>

            <details className="group mt-2">
              <summary className="cursor-pointer list-none text-[0.8rem] text-tenue hover:text-naranja">
                <span className="group-open:hidden">✎ Editar</span>
                <span className="hidden group-open:inline">✕ Cerrar</span>
              </summary>
              <div className="mt-3 border-t border-borde pt-3">
                <FormularioMarca
                  valores={{
                    id: marca.id,
                    nombre: marca.nombre,
                    orden: marca.orden,
                  }}
                />
              </div>
            </details>
          </li>
        ))}
      </ul>
    </>
  );
}
