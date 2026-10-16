"use client";

import { useActionState } from "react";
import { Boton } from "@/components/ui/Boton";
import { CampoTexto } from "@/components/ui/Campo";
import { MensajeAccion } from "@/components/ui/Mensaje";
import { ESTADO_INICIAL } from "@/lib/acciones";
import { iniciarSesion } from "@/features/auth/actions";

export function FormularioLogin({ destino }: { destino: string }) {
  const [estado, accion, pendiente] = useActionState(
    iniciarSesion,
    ESTADO_INICIAL
  );

  return (
    <form action={accion} className="flex flex-col gap-4">
      <input type="hidden" name="destino" value={destino} />

      <MensajeAccion estado={estado} />

      <CampoTexto
        etiqueta="Correo"
        name="email"
        type="email"
        autoComplete="username"
        placeholder="admin@tienda.local"
        required
        autoFocus
        errores={estado.errores?.email}
      />

      <CampoTexto
        etiqueta="Contraseña"
        name="password"
        type="password"
        autoComplete="current-password"
        placeholder="••••••••"
        required
        errores={estado.errores?.password}
      />

      <Boton type="submit" disabled={pendiente} className="mt-1 w-full py-3">
        {pendiente ? "Entrando…" : "Entrar al panel"}
      </Boton>
    </form>
  );
}
