"use client";

import type { ReactNode } from "react";

/**
 * Formulario de borrado con confirmación.
 *
 * Envuelve una server action de eliminación y pide confirmación antes de
 * ejecutarla. En React 19, un `onSubmit` que llama a `preventDefault()` cancela
 * la acción del formulario, así que si el usuario cancela, no se borra nada.
 *
 * El botón se pasa como `children` para que cada lugar conserve su estilo
 * propio (botón de peligro, enlace tenue, ícono ✕, etc.).
 */
export function FormEliminar({
  accion,
  id,
  mensaje,
  className,
  children,
}: {
  accion: (formData: FormData) => void | Promise<void>;
  id: string;
  mensaje: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <form
      action={accion}
      className={className}
      onSubmit={(evento) => {
        if (!window.confirm(mensaje)) evento.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      {children}
    </form>
  );
}
