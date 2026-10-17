"use client";

import { useActionState } from "react";
import { Boton } from "@/components/ui/Boton";
import { CampoCasilla, CampoTexto } from "@/components/ui/Campo";
import { MensajeAccion } from "@/components/ui/Mensaje";
import { ESTADO_INICIAL } from "@/lib/acciones";
import { eliminarSede, guardarSede } from "@/features/sedes/actions";

export type ValoresSede = {
  id: string;
  nombre: string;
  direccion: string;
  telefono: string;
  orden: number;
  activa: boolean;
  proximamente: boolean;
};

export function FormularioSede({ valores }: { valores?: ValoresSede }) {
  const [estado, accion, pendiente] = useActionState(guardarSede, ESTADO_INICIAL);

  // Si falló el guardado, `estado.valores` trae lo enviado (para repoblar).
  const v = (estado.valores as ValoresSede | undefined) ?? valores;

  return (
    <form key={estado.nonce ?? "inicial"} action={accion} className="flex flex-col gap-4">
      {valores && <input type="hidden" name="id" value={valores.id} />}

      <MensajeAccion estado={estado} />

      <div className="grid gap-4 sm:grid-cols-2">
        <CampoTexto
          etiqueta="Nombre"
          name="nombre"
          defaultValue={v?.nombre ?? ""}
          placeholder="Centro"
          required
          errores={estado.errores?.nombre}
        />
        <CampoTexto
          etiqueta="Teléfono"
          name="telefono"
          defaultValue={v?.telefono ?? ""}
          placeholder="6454 6710"
          errores={estado.errores?.telefono}
        />
      </div>

      <CampoTexto
        etiqueta="Dirección"
        name="direccion"
        defaultValue={v?.direccion ?? ""}
        placeholder="Dirección exacta: la que le dirías a alguien que va llegando"
        required
        errores={estado.errores?.direccion}
        ayuda="Escribila como se la darías a un cliente por teléfono, no con coordenadas."
      />

      <div className="grid gap-4 sm:grid-cols-[100px_1fr]">
        <CampoTexto
          etiqueta="Orden"
          name="orden"
          inputMode="numeric"
          defaultValue={String(v?.orden ?? 0)}
          errores={estado.errores?.orden}
        />
        <div className="flex flex-col justify-center gap-2">
          <CampoCasilla
            etiqueta="Activa"
            name="activa"
            defaultChecked={v?.activa ?? true}
            ayuda="Si la apagás, deja de aparecer en el sitio."
          />
          <CampoCasilla
            etiqueta="Próximamente"
            name="proximamente"
            defaultChecked={v?.proximamente ?? false}
            ayuda="Se anuncia en el sitio pero no lleva existencias todavía."
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Boton type="submit" disabled={pendiente} tamano="sm">
          {pendiente ? "Guardando…" : valores ? "Guardar" : "Crear sede"}
        </Boton>
      </div>
    </form>
  );
}

export function BotonEliminarSede({ id }: { id: string }) {
  const [estado, accion, pendiente] = useActionState(eliminarSede, ESTADO_INICIAL);

  return (
    <form action={accion} className="flex flex-col gap-2">
      <input type="hidden" name="id" value={id} />
      <MensajeAccion estado={estado} />
      <div>
        <Boton type="submit" variante="peligro" tamano="sm" disabled={pendiente}>
          {pendiente ? "Eliminando…" : "Eliminar sede"}
        </Boton>
      </div>
    </form>
  );
}
