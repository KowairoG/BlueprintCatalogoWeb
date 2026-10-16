"use client";

import { useActionState } from "react";
import { Boton } from "@/components/ui/Boton";
import { CampoSelect, CampoTexto } from "@/components/ui/Campo";
import { MensajeAccion } from "@/components/ui/Mensaje";
import { ESTADO_INICIAL } from "@/lib/acciones";
import { guardarCategoria } from "@/features/categorias/actions";

export type OpcionMadre = { id: string; nombre: string };

type Props = {
  madres: OpcionMadre[];
  valores?: {
    id: string;
    nombre: string;
    icono: string;
    descripcion: string;
    padreId: string;
    orden: number;
  };
  /** Al crear desde el listado conviene fijar la madre por adelantado. */
  padrePorDefecto?: string;
  onListo?: never;
};

export function FormularioCategoria({ madres, valores, padrePorDefecto }: Props) {
  const [estado, accion, pendiente] = useActionState(
    guardarCategoria,
    ESTADO_INICIAL
  );

  return (
    <form action={accion} className="flex flex-col gap-4">
      {valores && <input type="hidden" name="id" value={valores.id} />}

      <MensajeAccion estado={estado} />

      <div className="grid gap-4 sm:grid-cols-2">
        <CampoTexto
          etiqueta="Nombre"
          name="nombre"
          defaultValue={valores?.nombre ?? ""}
          placeholder="Frenos"
          required
          errores={estado.errores?.nombre}
        />
        <CampoSelect
          etiqueta="Depende de"
          name="padreId"
          defaultValue={valores?.padreId ?? padrePorDefecto ?? ""}
          errores={estado.errores?.padreId}
          ayuda="Sin madre = categoría principal del mega menú."
        >
          <option value="">— Categoría principal —</option>
          {madres
            .filter((madre) => madre.id !== valores?.id)
            .map((madre) => (
              <option key={madre.id} value={madre.id}>
                {madre.nombre}
              </option>
            ))}
        </CampoSelect>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <CampoTexto
          etiqueta="Ícono"
          name="icono"
          defaultValue={valores?.icono ?? ""}
          placeholder="🛑"
          maxLength={8}
          errores={estado.errores?.icono}
        />
        <CampoTexto
          etiqueta="Frase corta"
          name="descripcion"
          defaultValue={valores?.descripcion ?? ""}
          placeholder="Que frene cuando tiene que frenar"
          errores={estado.errores?.descripcion}
        />
        <CampoTexto
          etiqueta="Orden"
          name="orden"
          inputMode="numeric"
          defaultValue={String(valores?.orden ?? 0)}
          errores={estado.errores?.orden}
        />
      </div>

      <div>
        <Boton type="submit" disabled={pendiente} tamano="sm">
          {pendiente ? "Guardando…" : valores ? "Guardar" : "Crear categoría"}
        </Boton>
      </div>
    </form>
  );
}
