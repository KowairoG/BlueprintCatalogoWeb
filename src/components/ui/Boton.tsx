import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variante = "primario" | "secundario" | "peligro" | "fantasma" | "whatsapp";
type Tamano = "sm" | "md";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-[10px] font-bold " +
  "font-[inherit] transition-[filter,background-color,border-color,color] " +
  "disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer";

const VARIANTES: Record<Variante, string> = {
  primario: "bg-naranja text-naranja-oscuro hover:brightness-110",
  secundario:
    "bg-carbon border border-borde text-texto hover:border-naranja hover:text-naranja",
  peligro:
    "bg-transparent border border-rojo/50 text-rojo hover:bg-rojo hover:text-white",
  fantasma: "bg-transparent text-tenue hover:text-texto",
  whatsapp: "bg-wa text-wa-oscuro hover:brightness-110",
};

const TAMANOS: Record<Tamano, string> = {
  sm: "px-3 py-1.5 text-[0.8rem]",
  md: "px-4 py-2.5 text-[0.88rem]",
};

function clases(variante: Variante, tamano: Tamano, extra?: string) {
  return [BASE, VARIANTES[variante], TAMANOS[tamano], extra]
    .filter(Boolean)
    .join(" ");
}

type PropsBoton = ComponentProps<"button"> & {
  variante?: Variante;
  tamano?: Tamano;
  children: ReactNode;
};

export function Boton({
  variante = "primario",
  tamano = "md",
  className,
  children,
  ...resto
}: PropsBoton) {
  return (
    <button className={clases(variante, tamano, className)} {...resto}>
      {children}
    </button>
  );
}

type PropsBotonLink = ComponentProps<typeof Link> & {
  variante?: Variante;
  tamano?: Tamano;
  children: ReactNode;
};

export function BotonLink({
  variante = "primario",
  tamano = "md",
  className,
  children,
  ...resto
}: PropsBotonLink) {
  return (
    <Link className={clases(variante, tamano, className)} {...resto}>
      {children}
    </Link>
  );
}
