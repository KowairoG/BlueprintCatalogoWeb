"use client";

import { useActionState } from "react";
import { Boton } from "@/components/ui/Boton";
import { MensajeAccion } from "@/components/ui/Mensaje";
import { ESTADO_INICIAL } from "@/lib/acciones";
import { TEXTO_ESTADO_STOCK } from "@/lib/constantes";
import { CLASE_ESTADO, CLASE_PUNTO, estadoDeStock } from "@/lib/stock";
import { ajustarExistencias } from "@/features/inventario/actions";

/**
 * Ajuste de existencias de una sede en una sola tabla.
 *
 * Se guarda todo de un golpe: la acción compara con lo que había y solo
 * escribe lo que cambió.
 */

export type FilaInventario = {
  productoId: string;
  nombre: string;
  sku: string | null;
  categoria: string;
  cantidad: number;
  umbralBajo: number;
};

export function MatrizExistencias({
  sedeId,
  sedeNombre,
  filas,
  soloLectura,
  nombreInventario,
}: {
  sedeId: string;
  sedeNombre: string;
  filas: FilaInventario[];
  soloLectura: boolean;
  nombreInventario: string;
}) {
  const [estado, accion, pendiente] = useActionState(
    ajustarExistencias,
    ESTADO_INICIAL
  );

  return (
    <form action={accion} className="flex flex-col gap-4">
      <input type="hidden" name="sedeId" value={sedeId} />

      <MensajeAccion estado={estado} />

      <div className="overflow-x-auto rounded-2xl border border-borde">
        <table className="w-full min-w-[560px] border-collapse text-left">
          <thead>
            <tr className="bg-carbon text-[0.72rem] uppercase tracking-[0.09em] text-tenue">
              <th className="px-4 py-3 font-bold">Producto</th>
              <th className="px-4 py-3 font-bold">Estado actual</th>
              <th className="w-32 px-4 py-3 font-bold">Unidades</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((fila) => {
              const actual = estadoDeStock(fila.cantidad, fila.umbralBajo);
              return (
                <tr key={fila.productoId} className="border-t border-borde bg-carbon/40">
                  <td className="px-4 py-2.5">
                    <span className="font-semibold">{fila.nombre}</span>
                    <span className="block text-[0.75rem] text-tenue">
                      {[fila.categoria, fila.sku].filter(Boolean).join(" · ")}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`flex items-center gap-2 text-[0.8rem] ${CLASE_ESTADO[actual]}`}
                    >
                      <span
                        aria-hidden
                        className={`inline-block size-[7px] rounded-full ${CLASE_PUNTO[actual]}`}
                      />
                      {TEXTO_ESTADO_STOCK[actual]}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <input
                      name={`cantidad_${fila.productoId}`}
                      inputMode="numeric"
                      defaultValue={String(fila.cantidad)}
                      disabled={soloLectura}
                      aria-label={`Unidades de ${fila.nombre} en ${sedeNombre}`}
                      className="w-24 rounded-lg border border-borde bg-carbon-2 px-3 py-1.5 text-[0.9rem] text-texto focus:border-naranja focus:outline-none disabled:opacity-60"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!soloLectura ? (
        <div className="sticky bottom-0 -mx-5 flex items-center gap-3 border-t border-borde bg-negro/95 px-5 py-4 backdrop-blur lg:-mx-9 lg:px-9">
          <Boton type="submit" disabled={pendiente}>
            {pendiente ? "Guardando…" : `Guardar existencias de ${sedeNombre}`}
          </Boton>
          <span className="text-[0.8rem] text-tenue">
            Solo se guardan las cantidades que cambiaste.
          </span>
        </div>
      ) : (
        <p className="text-[0.85rem] text-amarillo">
          Las existencias vienen de {nombreInventario}: acá se consultan, no se
          editan.
        </p>
      )}
    </form>
  );
}
