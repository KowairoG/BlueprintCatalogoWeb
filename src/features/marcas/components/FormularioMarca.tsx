"use client";

import { useActionState } from "react";
import { Boton } from "@/components/ui/Boton";
import { CampoTexto } from "@/components/ui/Campo";
import { MensajeAccion } from "@/components/ui/Mensaje";
import { ESTADO_INICIAL } from "@/lib/acciones";
import { guardarMarca } from "@/features/marcas/actions";

export function FormularioMarca({
  valores,
}: {
  valores?: { id: string; nombre: string; orden: number };
}) {
  const [estado, accion, pendiente] = useActionState(guardarMarca, ESTADO_INICIAL);

  return (
    <form action={accion} className="flex flex-col gap-3">
      {valores && <input type="hidden" name="id" value={valores.id} />}

      <MensajeAccion estado={estado} />

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[180px] flex-1">
          <CampoTexto
            etiqueta="Nombre"
            name="nombre"
            defaultValue={valores?.nombre ?? ""}
            placeholder="Nombre de la marca"
            required
            errores={estado.errores?.nombre}
          />
        </div>
        <div className="w-24">
          <CampoTexto
            etiqueta="Orden"
            name="orden"
            inputMode="numeric"
            defaultValue={String(valores?.orden ?? 0)}
            errores={estado.errores?.orden}
          />
        </div>
        <Boton type="submit" disabled={pendiente} tamano="sm" className="mb-0.5">
          {pendiente ? "Guardando…" : valores ? "Guardar" : "Agregar"}
        </Boton>
      </div>
    </form>
  );
}
