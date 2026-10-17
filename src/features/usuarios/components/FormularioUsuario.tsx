"use client";

import { useActionState } from "react";
import { Boton } from "@/components/ui/Boton";
import { CampoCasilla, CampoSelect, CampoTexto } from "@/components/ui/Campo";
import { MensajeAccion } from "@/components/ui/Mensaje";
import { ESTADO_INICIAL } from "@/lib/acciones";
import { DESCRIPCION_ROL, ETIQUETA_ROL, ROLES } from "@/lib/constantes";
import {
  actualizarUsuario,
  crearUsuario,
  eliminarUsuario,
} from "@/features/usuarios/actions";

export type ValoresUsuario = {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  activo: boolean;
};

export function FormularioUsuario({ valores }: { valores?: ValoresUsuario }) {
  const [estado, accion, pendiente] = useActionState(
    valores ? actualizarUsuario : crearUsuario,
    ESTADO_INICIAL
  );

  // Si falló el guardado, `estado.valores` trae lo enviado (sin password).
  const v = (estado.valores as ValoresUsuario | undefined) ?? valores;

  return (
    <form key={estado.nonce ?? "inicial"} action={accion} className="flex flex-col gap-4">
      {valores && <input type="hidden" name="id" value={valores.id} />}

      <MensajeAccion estado={estado} />

      <div className="grid gap-4 sm:grid-cols-2">
        <CampoTexto
          etiqueta="Nombre"
          name="nombre"
          defaultValue={v?.nombre ?? ""}
          required
          errores={estado.errores?.nombre}
        />
        <CampoTexto
          etiqueta="Correo"
          name="email"
          type="email"
          autoComplete="off"
          defaultValue={v?.email ?? ""}
          required
          errores={estado.errores?.email}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <CampoTexto
          etiqueta="Contraseña"
          name="password"
          type="password"
          autoComplete="new-password"
          required={!valores}
          errores={estado.errores?.password}
          ayuda={
            valores
              ? "Dejala vacía para no cambiarla."
              : "Mínimo 8 caracteres."
          }
        />
        <CampoSelect
          etiqueta="Rol"
          name="rol"
          defaultValue={v?.rol ?? "EDITOR"}
          errores={estado.errores?.rol}
          ayuda={DESCRIPCION_ROL.EDITOR}
        >
          {ROLES.map((rol) => (
            <option key={rol} value={rol}>
              {ETIQUETA_ROL[rol]}
            </option>
          ))}
        </CampoSelect>
      </div>

      <CampoCasilla
        etiqueta="Cuenta activa"
        name="activo"
        defaultChecked={v?.activo ?? true}
        ayuda="Al desactivarla, la persona pierde el acceso de inmediato aunque tenga la sesión abierta."
      />

      <div>
        <Boton type="submit" disabled={pendiente} tamano="sm">
          {pendiente ? "Guardando…" : valores ? "Guardar" : "Crear cuenta"}
        </Boton>
      </div>
    </form>
  );
}

export function BotonEliminarUsuario({ id }: { id: string }) {
  const [estado, accion, pendiente] = useActionState(
    eliminarUsuario,
    ESTADO_INICIAL
  );

  return (
    <form action={accion} className="flex flex-col gap-2">
      <input type="hidden" name="id" value={id} />
      <MensajeAccion estado={estado} />
      <div>
        <Boton type="submit" variante="peligro" tamano="sm" disabled={pendiente}>
          {pendiente ? "Eliminando…" : "Eliminar cuenta"}
        </Boton>
      </div>
    </form>
  );
}
