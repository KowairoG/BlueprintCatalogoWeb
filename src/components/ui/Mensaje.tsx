import type { ReactNode } from "react";
import type { EstadoAccion } from "@/lib/acciones";

type Tono = "exito" | "error" | "aviso" | "info";

const TONOS: Record<Tono, string> = {
  exito: "border-verde/40 bg-verde/10 text-verde",
  error: "border-rojo/40 bg-rojo/10 text-rojo",
  aviso: "border-amarillo/40 bg-amarillo/10 text-amarillo",
  info: "border-borde bg-carbon-2 text-tenue",
};

const ICONOS: Record<Tono, string> = {
  exito: "✓",
  error: "✕",
  aviso: "⚠",
  info: "ℹ",
};

export function Mensaje({
  tono = "info",
  children,
}: {
  tono?: Tono;
  children: ReactNode;
}) {
  return (
    <div
      role={tono === "error" ? "alert" : "status"}
      className={`flex gap-2.5 rounded-[10px] border px-4 py-3 text-[0.87rem] ${TONOS[tono]}`}
    >
      <span aria-hidden className="shrink-0 font-bold">
        {ICONOS[tono]}
      </span>
      <div className="whitespace-pre-line">{children}</div>
    </div>
  );
}

/** Muestra el resultado de una server action, si tiene mensaje. */
export function MensajeAccion({ estado }: { estado: EstadoAccion }) {
  if (!estado.mensaje) return null;
  return (
    <Mensaje tono={estado.ok ? "exito" : "error"}>{estado.mensaje}</Mensaje>
  );
}
